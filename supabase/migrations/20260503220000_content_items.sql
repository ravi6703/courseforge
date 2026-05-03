-- Step 1: Create ENUM types for content management
CREATE TYPE content_kind AS ENUM ('pq', 'gq', 'reading', 'scorm', 'ai_coach');
CREATE TYPE content_status AS ENUM ('draft', 'approved');

-- Step 2: Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  course_id UUID NOT NULL,
  video_id UUID NOT NULL,
  kind content_kind NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  generation_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_content_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_approver FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Unique constraint: only one content item per video per kind
  UNIQUE (video_id, kind)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_content_org_id ON content_items(org_id);
CREATE INDEX idx_content_course_id ON content_items(course_id);
CREATE INDEX idx_content_video_id ON content_items(video_id);
CREATE INDEX idx_content_kind ON content_items(kind);
CREATE INDEX idx_content_status ON content_items(status);

-- Step 4: Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- SELECT policy: org members can view their org's content items
CREATE POLICY "content_items_org_select" ON content_items FOR SELECT
  USING (org_id = current_user_org_id());

-- INSERT policy: org members can create content items for their org
CREATE POLICY "content_items_org_insert" ON content_items FOR INSERT
  WITH CHECK (org_id = current_user_org_id());

-- UPDATE policy: org members can update their org's content items
CREATE POLICY "content_items_org_update" ON content_items FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- DELETE policy: org members can delete their org's content items (draft only)
CREATE POLICY "content_items_org_delete" ON content_items FOR DELETE
  USING (org_id = current_user_org_id() AND status = 'draft');

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_items_update_timestamp
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_content_items_updated_at();
