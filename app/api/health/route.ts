import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id")
      .limit(1);

    if (error) {
      return Response.json(
        {
          ok: false,
          service: "travel-opportunity-feed",
          database: "supabase",
          message: "Supabase query failed",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      service: "travel-opportunity-feed",
      database: "supabase",
      message: "Supabase connection successful",
      opportunitiesTableReachable: true,
      rowSampleCount: data?.length ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return Response.json(
      {
        ok: false,
        service: "travel-opportunity-feed",
        database: "supabase",
        message: "Unexpected server error",
        error: message,
      },
      { status: 500 }
    );
  }
}