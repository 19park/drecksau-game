import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)

  const initialize = async () => {
    loading.value = true
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        user.value = session?.user ?? null
        
        if (event === 'SIGNED_IN') {
          router.push('/lobby')
        } else if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      loading.value = false
    }
  }


  const signOut = async () => {
    loading.value = true
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      user.value = null
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      loading.value = false
    }
  }

  const signInWithMagicLink = async (email: string) => {
    loading.value = true
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const signInWithGoogle = async () => {
    loading.value = true
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const handleAuthCallback = async () => {
    loading.value = true
    
    try {
      const url = new URL(window.location.href)
      
      // Check for magic link params in query string
      const token_hash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      
      console.log('🔍 Callback URL:', window.location.href)
      console.log('🔍 Callback params:', { 
        token_hash: !!token_hash, 
        type, 
        hasHash: !!url.hash
      })
      
      // Handle Magic Link callback (token_hash + type)
      if (token_hash && type) {
        console.log('🔗 Processing magic link callback')
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any
        })
        
        if (error) {
          console.error('❌ Magic link verification error:', error)
          return { error: error.message }
        }
        
        if (data.session) {
          user.value = data.session.user
          console.log('✅ Magic link authentication successful:', data.session.user.email)
          return { error: null, user: data.session.user }
        }
      }
      
      // For OAuth callback, Supabase automatically processes URL fragments
      // when detectSessionInUrl is true, so just get current session
      console.log('🔗 Getting current session after OAuth callback')
      
      // Add a small delay to allow Supabase to process the URL fragments
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        return { error: sessionError.message }
      }
      
      if (sessionData.session) {
        user.value = sessionData.session.user
        console.log('✅ Authentication successful:', sessionData.session.user.email)
        return { error: null, user: sessionData.session.user }
      }
      
      return { error: '로그인 세션을 찾을 수 없습니다' }
      
    } catch (error: any) {
      console.error('❌ Unexpected auth callback error:', error)
      return { error: error.message || '알 수 없는 오류가 발생했습니다' }
    } finally {
      loading.value = false
    }
  }


  return {
    user,
    loading,
    isAuthenticated,
    initialize,
    signOut,
    signInWithMagicLink,
    signInWithGoogle,
    handleAuthCallback
  }
})