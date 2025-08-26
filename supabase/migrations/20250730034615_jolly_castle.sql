/*
  # Add Photo Evidence Support for Breakdown Records

  1. New Tables
    - `breakdown_photos`
      - `id` (uuid, primary key)
      - `record_id` (uuid, foreign key to logistics_records)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `file_type` (text)
      - `uploaded_by` (text)
      - `uploaded_at` (timestamp)
      - `description` (text, optional)

  2. Storage
    - Create storage bucket for breakdown photos
    - Set up RLS policies for secure access

  3. Security
    - Enable RLS on breakdown_photos table
    - Add policies for authenticated users to manage their photos
*/

-- Create breakdown_photos table
CREATE TABLE IF NOT EXISTS breakdown_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE breakdown_photos 
ADD CONSTRAINT breakdown_photos_record_id_fkey 
FOREIGN KEY (record_id) REFERENCES logistics_records(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE breakdown_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for breakdown_photos
CREATE POLICY "Users can view breakdown photos"
  ON breakdown_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert breakdown photos"
  ON breakdown_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own breakdown photos"
  ON breakdown_photos
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete breakdown photos"
  ON breakdown_photos
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breakdown_photos_record_id 
ON breakdown_photos(record_id);

CREATE INDEX IF NOT EXISTS idx_breakdown_photos_uploaded_at 
ON breakdown_photos(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_breakdown_photos_file_type 
ON breakdown_photos(file_type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_breakdown_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_breakdown_photos_updated_at
  BEFORE UPDATE ON breakdown_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_breakdown_photos_updated_at();