-- Fix foreign key relationship for room_players (SAFE VERSION)
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table that mirrors auth.users with public access
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Populate profiles table with existing users FIRST
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- 5. Clean up orphaned room_players entries (players that don't exist in auth.users)
DELETE FROM room_players 
WHERE player_id NOT IN (SELECT id FROM auth.users);

-- 6. Clean up orphaned rooms entries (creators that don't exist in auth.users)  
DELETE FROM rooms 
WHERE creator_id IS NOT NULL 
AND creator_id NOT IN (SELECT id FROM auth.users);

-- 7. Now safely add foreign key constraints
ALTER TABLE room_players 
DROP CONSTRAINT IF EXISTS fk_room_players_player_id;

ALTER TABLE room_players 
ADD CONSTRAINT fk_room_players_player_id 
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE rooms 
DROP CONSTRAINT IF EXISTS fk_rooms_creator_id;

ALTER TABLE rooms 
ADD CONSTRAINT fk_rooms_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Enable realtime for profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;