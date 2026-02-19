import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExampleTexts } from "@/components/resume/UploadExamples";

const CACHE_KEYS = {
  exampleResumeText: "default_example_resume",
  exampleCoverLetterText: "default_example_coverletter",
  styledResumeText: "default_styled_resume",
  styledCoverLetterText: "default_styled_coverletter",
} as const;

const PDF_URLS: Record<keyof ExampleTexts, string> = {
  exampleResumeText: "/examples/example-resume.pdf",
  exampleCoverLetterText: "/examples/example-coverletter.pdf",
  styledResumeText: "/examples/styled-resume.pdf",
  styledCoverLetterText: "/examples/styled-coverletter.pdf",
};

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function parsePdf(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = await arrayBufferToBase64(buffer);
    const { data, error } = await supabase.functions.invoke("parse-resume-pdf", {
      body: { pdfBase64: base64, fileName: url.split("/").pop() },
    });
    if (error || !data?.rawText) return null;
    return data.rawText as string;
  } catch {
    return null;
  }
}

function loadFromCache(): Partial<ExampleTexts> {
  const cached: Partial<ExampleTexts> = {};
  for (const [key, storageKey] of Object.entries(CACHE_KEYS)) {
    const value = localStorage.getItem(storageKey);
    if (value) {
      cached[key as keyof ExampleTexts] = value;
    }
  }
  return cached;
}

export function useDefaultExamples(): { examples: ExampleTexts; isLoading: boolean } {
  const [examples, setExamples] = useState<ExampleTexts>(() => {
    const cached = loadFromCache();
    return {
      exampleResumeText: cached.exampleResumeText ?? null,
      exampleCoverLetterText: cached.exampleCoverLetterText ?? null,
      styledResumeText: cached.styledResumeText ?? null,
      styledCoverLetterText: cached.styledCoverLetterText ?? null,
    };
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = loadFromCache();
    return Object.keys(cached).length < 4;
  });

  useEffect(() => {
    const missing = (Object.keys(CACHE_KEYS) as Array<keyof ExampleTexts>).filter(
      (key) => !localStorage.getItem(CACHE_KEYS[key])
    );

    if (missing.length === 0) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const updates: Partial<ExampleTexts> = {};

      await Promise.all(
        missing.map(async (key) => {
          const text = await parsePdf(PDF_URLS[key]);
          if (text) {
            localStorage.setItem(CACHE_KEYS[key], text);
            updates[key] = text;
          }
        })
      );

      if (!cancelled) {
        setExamples((prev) => ({ ...prev, ...updates }));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { examples, isLoading };
}
