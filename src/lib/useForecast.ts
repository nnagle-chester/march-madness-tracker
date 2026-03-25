"use client";

import { useState, useEffect, useCallback } from "react";
import { ForecastResponse } from "@/lib/simulation/types";

export function useForecast() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async (refresh = false) => {
    try {
      const params = refresh ? "?refresh=true" : "";
      const res = await fetch(`/api/forecast${params}`);
      if (!res.ok) throw new Error("Forecast unavailable");
      const data: ForecastResponse = await res.json();
      setForecast(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();

    // Re-fetch every 5 minutes
    const interval = setInterval(() => fetchForecast(), 300000);
    return () => clearInterval(interval);
  }, [fetchForecast]);

  return {
    forecast,
    loading,
    error,
    refetch: () => fetchForecast(true),
  };
}
