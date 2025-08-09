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

  const signIn = async (email: string, password: string) => {
    loading.value = true
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const signUp = async (email: string, password: string) => {
    loading.value = true
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
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
      // Handle the callback from magic link or OAuth
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        return { error: error.message }
      }
      
      if (data.session) {
        user.value = data.session.user
        console.log('✅ User authenticated:', data.session.user.email)
        return { error: null, user: data.session.user }
      } else {
        return { error: '로그인 세션을 찾을 수 없습니다' }
      }
    } catch (error: any) {
      console.error('Unexpected auth callback error:', error)
      return { error: error.message || '알 수 없는 오류가 발생했습니다' }
    } finally {
      loading.value = false
    }
  }

  const signUpOrSignIn = async (email: string, password?: string) => {
    if (!password) {
      // No password provided, use magic link
      return await signInWithMagicLink(email)
    }
    
    loading.value = true
    
    try {
      // First try to sign in
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInResult.error) {
        // If sign in fails, try to sign up
        if (signInResult.error.message.includes('Invalid login credentials')) {
          const signUpResult = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          })
          
          if (signUpResult.error) throw signUpResult.error
          
          return { 
            data: signUpResult.data, 
            error: null, 
            isNewUser: true 
          }
        } else {
          throw signInResult.error
        }
      }
      
      return { 
        data: signInResult.data, 
        error: null, 
        isNewUser: false 
      }
      
    } catch (error: any) {
      return { data: null, error: error.message, isNewUser: false }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    signInWithMagicLink,
    signInWithGoogle,
    handleAuthCallback,
    signUpOrSignIn
  }
})