import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uieqausjstnncpeqrpph.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZXFhdXNqc3RubmNwZXFycHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk2NDU2NSwiZXhwIjoyMDg2NTQwNTY1fQ.E1nzjgArQKZud_CuLII0LgCiHFvfYYsP-hgCThXJFQ4"
);