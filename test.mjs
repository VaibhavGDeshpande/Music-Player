import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uieqausjstnncpeqrpph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZXFhdXNqc3RubmNwZXFycHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk2NDU2NSwiZXhwIjoyMDg2NTQwNTY1fQ.E1nzjgArQKZud_CuLII0LgCiHFvfYYsP-hgCThXJFQ4'
);

async function test() {
  const { data, error } = await supabase
    .from('play_history')
    .select('id, played_at, track_name, listened_ms, duration_ms')
    .order('played_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
  } else {
    let totalMs = 0;
    data.forEach(play => {
      console.log(`[${play.played_at}] ${play.track_name} - list: ${play.listened_ms}, dur: ${play.duration_ms}`);
      totalMs += play.listened_ms || play.duration_ms || 0;
    });
    console.log('Total ms: ', totalMs);
    console.log('Total minutes: ', Math.round(totalMs / 60000));
  }
}

test();
