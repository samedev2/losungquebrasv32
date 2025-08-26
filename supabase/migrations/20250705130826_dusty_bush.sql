/*
  # Fix Row-Level Security for Anonymous Access

  1. Security Updates
    - Update RLS policies to allow anonymous users to insert records
    - Maintain read access for anonymous users
    - Keep all operations available for authenticated users
  
  2. Changes Made
    - Add policy for anonymous INSERT operations on logistics_records
    - Add policy for anonymous INSERT operations on status_updates
    - Ensure anonymous users can create records without authentication
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow all operations on logistics_records" ON logistics_records;
DROP POLICY IF EXISTS "Allow anonymous read on logistics_records" ON logistics_records;
DROP POLICY IF EXISTS "Allow all operations on status_updates" ON status_updates;
DROP POLICY IF EXISTS "Allow anonymous read on status_updates" ON status_updates;

-- Create new policies for logistics_records
CREATE POLICY "Allow authenticated all operations on logistics_records"
  ON logistics_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read and insert on logistics_records"
  ON logistics_records
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on logistics_records"
  ON logistics_records
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create new policies for status_updates
CREATE POLICY "Allow authenticated all operations on status_updates"
  ON status_updates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read on status_updates"
  ON status_updates
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on status_updates"
  ON status_updates
  FOR INSERT
  TO anon
  WITH CHECK (true);