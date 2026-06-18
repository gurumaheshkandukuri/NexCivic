import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Google Gemini Client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Help handle JSON parsing reliably from LLM outputs
function cleanAndParseJSON(text: string) {
  try {
    let raw = text.trim();
    if (raw.startsWith("```json")) {
      raw = raw.substring(7);
    }
    if (raw.endsWith("```")) {
      raw = raw.substring(0, raw.length - 3);
    }
    return JSON.parse(raw.trim());
  } catch (err) {
    console.error("JSON parse error on raw text:", text, err);
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

// 1. Auto-Categorize Issue Route
app.post("/api/gemini/categorize", async (req, res) => {
  const { title, description } = req.body;
  if (!title && !description) {
    return res.status(400).json({ error: "Title or Description is required" });
  }

  try {
    const prompt = `You are a professional civic issue classifier.
Given this issue title: "${title || 'N/A'}"
And description: "${description || 'N/A'}"

Classify into EXACTLY ONE category:
[Pothole, Garbage Overflow, Water Leakage, Street Light, Drainage, Infrastructure, Other]

Also determine the priority severity: [Low, Medium, High, Critical]

Return JSON only conforming to:
{
  "category": "category string",
  "priority": "priority string",
  "confidence": 95
}
Do not return any explanations or markdown wrappers. Must be plain JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            confidence: { type: Type.INTEGER }
          },
          required: ["category", "priority", "confidence"]
        }
      }
    });

    res.json(cleanAndParseJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Categorization Error:", error);
    res.status(500).json({ error: error.message, fallback: true });
  }
});

// 1.5. Suggest Department Route
app.post("/api/gemini/suggest-department", async (req, res) => {
  const { title, description } = req.body;
  if (!description && !title) {
    return res.status(400).json({ error: "Title or Description is required" });
  }

  try {
    const prompt = `You are a civic department categorizer. Given the title "${title || "N/A"}" and description "${description || "N/A"}", determine which department should handle this civic issue.
Choose EXACTLY ONE from this list:
[Sanitation, Roads, Utilities, Other]

Return JSON representing the choice matching:
{
  "suggestedDepartment": "DepartmentName"
}
Do not include any explanations, markdown code fences or wrappers. Return plain JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedDepartment: { type: Type.STRING }
          },
          required: ["suggestedDepartment"]
        }
      }
    });

    res.json(cleanAndParseJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Suggested Department Error:", error);
    res.json({ suggestedDepartment: "Other" });
  }
});

// 2. Analyze Photo Route
app.post("/api/gemini/analyze-photo", async (req, res) => {
  const { imageBase64 } = req.body; // base64 string without data:image/png;base64, prefix
  if (!imageBase64) {
    return res.status(400).json({ error: "Base64 image data is required" });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    };
    const textPart = {
      text: `Analyze this civic issue photo.
Identify: issue type category (must be Pothole, Garbage Overflow, Water Leakage, Street Light, Drainage, Infrastructure, Or Other), severity (must be Low, Medium, High, Critical), descriptive details, and estimated confidence.

Return JSON only in this format:
{
  "category": "Pothole",
  "priority": "High",
  "description": "Clear explanation of what was analyzed in the image",
  "confidence": 90
}`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            description: { type: Type.STRING },
            confidence: { type: Type.INTEGER }
          },
          required: ["category", "priority", "description", "confidence"]
        }
      }
    });

    res.json(cleanAndParseJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Semantic Duplicate Check Route
app.post("/api/gemini/check-duplicates", async (req, res) => {
  const { newIssue, existingIssues } = req.body;
  if (!newIssue || !existingIssues || !Array.isArray(existingIssues)) {
    return res.status(400).json({ error: "newIssue and existingIssues array are required" });
  }

  try {
    const prompt = `New reported civic issue:
Title: "${newIssue.title}"
Description: "${newIssue.description}"
Category: "${newIssue.category}"

Existing nearby problems:
${existingIssues.map((issue, idx) => `${idx + 1}. [ID: ${issue.id}] Title: "${issue.title}", Description: "${issue.description}", Category: "${issue.category}"`).join("\n")}

Determine if any existing issue describes the identical physical/structural problem.
Only return similarity if they are highly similar. Let the similarity_score be a value from 0 to 1.
Reasoning should explain why they are or are not identical.

Return JSON in this format:
{
  "duplicates": [
    { "id": "matched_issue_id", "similarity_score": 0.85, "reason": "Both describe the exact main road water-main leak at this specific junction" }
  ]
}
If there are no actual semantic duplicates, return:
{ "duplicates": [] }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json(cleanAndParseJSON(response.text || '{"duplicates": []}'));
  } catch (error: any) {
    console.error("Gemini Duplicate Check Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Resolution Steps Route
app.post("/api/gemini/suggest-resolution", async (req, res) => {
  const { category, priority, title, description } = req.body;
  try {
    const prompt = `Generate a standard technical resolution blueprint for this reported civic problem:
Category: ${category || "Civic Issue"}
Severity level: ${priority || "Medium"}
Title: ${title || "N/A"}
Description: ${description || "N/A"}

Suggest steps that municipality field workers should execute to resolve this efficiently, estimated days to complete, and materials or crews required.

Respond with JSON only, matching this schema:
{
  "steps": ["Step 1 description", "Step 2 description", "Step 3 description"],
  "estimatedDays": 3,
  "resources": ["Crew of 3 cleaners", "Protective equipment", "Excavator"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json(cleanAndParseJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Suggest Resolution Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Scan Duplicates for Array list Route
app.post("/api/gemini/scan-duplicates", async (req, res) => {
  const { issues } = req.body;
  if (!issues || !Array.isArray(issues)) {
    return res.status(400).json({ error: "Issues list is required" });
  }

  try {
    const prompt = `You are a municipal records auditor. Given this collection of civic issue reports, scan them to identify any pairs of duplicates representing the same physical location and issue category (e.g. two separate reports of the same garbage site or pothole).
    
    Collection:
    ${JSON.stringify(issues.slice(0, 50))}

    Identify duplicates and match them. Return JSON format conforming to:
    {
      "duplicates": [
        {
          "primaryIssueId": "id_of_the_older_issue",
          "primaryIssueTitle": "title",
          "duplicateIssueId": "id_of_the_newer_duplicate_issue",
          "duplicateTitle": "title",
          "reason": "Specific reason why they are clones (e.g. both describe a deep pothole near gateway of India promenade)"
        }
      ]
    }
    If there are no duplicates, return: { "duplicates": [] }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json(cleanAndParseJSON(response.text || '{"duplicates": []}'));
  } catch (error: any) {
    console.error("Duplicate scanning failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Survey Insights Route
app.post("/api/gemini/survey-insights", async (req, res) => {
  const responses = req.body.responses || req.body.surveyData;
  if (!responses || !Array.isArray(responses)) {
    return res.status(400).json({ error: "Responses array is required" });
  }

  try {
    const prompt = `You are a civic analytics consultant. Analyze these citizen general satisfaction survey responses and Google sheets columns:
    
    ${JSON.stringify(responses.slice(0, 40))}

    Deliver continuous strategic text summaries, insights, overall satisfaction ratings, areas that are problematic, and suggestions to boost municipality efficiency.

    Return a clean, conversational text summary representing:
    - Overall citizen satisfaction level.
    - Demographics overview (Age, City, App comfort level).
    - Hardest hit locations and most recurring categories of civic issues.
    - Priority dispatch checklists for municipal commissioners.
    
    Format nicely in markdown-ready structures.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ insights: response.text || "No insights returned." });
  } catch (error: any) {
    console.error("Gemini Survey Analytics Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
