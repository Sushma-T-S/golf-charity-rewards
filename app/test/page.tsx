export default function Test2() {
  return (
    <div>
      <h1>ADMIN KEY TEST</h1>

      <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>

      <p>
        SERVICE KEY:
        {process.env.SUPABASE_SERVICE_ROLE_KEY ? "LOADED" : "MISSING"}
      </p>
    </div>
  );
}