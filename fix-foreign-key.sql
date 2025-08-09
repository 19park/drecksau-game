-- Fix foreign key relationship for room_players
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
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Add foreign key constraint to room_players
ALTER TABLE room_players 
ADD CONSTRAINT fk_room_players_player_id 
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Add foreign key constraint for room creator
ALTER TABLE rooms 
ADD CONSTRAINT fk_rooms_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Populate profiles table with existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- 9. Enable realtime for profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;