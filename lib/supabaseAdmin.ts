// import { createClient } from "@supabase/supabase-js";

// export const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT FIX
// );
// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// export const supabase = createClient(
//   supabaseUrl,
//   supabaseKey
// );
import { createClient } from "@supabase/supabase-js";

console.log(
  "SERVICE KEY FOUND:",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log("SUPABASE_URL_USED:", supabaseUrl ? "present" : "missing");
