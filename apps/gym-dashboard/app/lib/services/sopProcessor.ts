import OpenAI from "openai";
import { SOPAnalysisResult, SOPDocumentUpload } from "@/app/lib/types/sop";

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  return openai;
}

export class SOPProcessor {
  private static instance: SOPProcessor;

  private constructor() {
    // Constructor is private for singleton pattern
  }

  public static getInstance(): SOPProcessor {
    if (!SOPProcessor.instance) {
      SOPProcessor.instance = new SOPProcessor();
    }
    return SOPProcessor.instance;
  }

  /**
   * Extract text content from uploaded document
   */
  async extractTextFromDocument(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    try {
      switch (file.type) {
        case "application/pdf":
          return await this.extractFromPDF(uint8Array);
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          return await this.extractFromDOCX(uint8Array);
        case "text/plain":
          return new TextDecoder().decode(uint8Array);
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      console.error("Error extracting text from document:", error);
      throw new Error("Failed to extract text from document");
    }
  }

  private async extractFromPDF(buffer: Uint8Array): Promise<string> {
    try {
      // For now, return a placeholder message
      // In production, you would integrate with a PDF parsing library
      // like pdf-parse, pdfjs-dist, or use a cloud service
      throw new Error(
        "PDF parsing not implemented. Please convert to text file or use copy-paste.",
      );
    } catch (error) {
      throw new Error(
        "Failed to extract PDF content. Please convert to text format.",
      );
    }
  }

  private async extractFromDOCX(buffer: Uint8Array): Promise<string> {
    try {
      // For now, return a placeholder message
      // In production, you would integrate with mammoth or docx2txt
      // or use a cloud service like Google Docs API
      throw new Error(
        "DOCX parsing not implemented. Please convert to text file or use copy-paste.",
      );
    } catch (error) {
      throw new Error(
        "Failed to extract DOCX content. Please convert to text format.",
      );
    }
  }

  /**
   * Analyze SOP content using AI to generate insights
   */
  async analyzeSOP(content: string, title: string): Promise<SOPAnalysisResult> {
    try {
      const prompt = `
Analyze the following Standard Operating Procedure (SOP) and provide detailed insights:

Title: ${title}
Content: ${content}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "Brief summary of the SOP (2-3 sentences)",
  "key_points": ["List of 3-5 key points or steps"],
  "complexity_score": number between 1-10 (1=simple, 10=very complex),
  "related_topics": ["List of related topics or procedures"],
  "suggested_tags": ["Relevant tags for categorization"],
  "training_recommendations": {
    "required": boolean,
    "difficulty": "beginner|intermediate|advanced",
    "estimated_time_minutes": number
  }
}

Focus on practical insights that would help gym staff understand and follow the procedure effectively.
`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in analyzing standard operating procedures for fitness facilities. Provide detailed, actionable insights that help staff understand and implement procedures effectively.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");

      return {
        summary: analysis.summary || "No summary available",
        key_points: analysis.key_points || [],
        complexity_score: analysis.complexity_score || 5,
        related_sops: [], // Will be populated by vector search
        suggested_tags: analysis.suggested_tags || [],
        training_recommendations: {
          required: analysis.training_recommendations?.required || false,
          difficulty:
            analysis.training_recommendations?.difficulty || "intermediate",
          estimated_time_minutes:
            analysis.training_recommendations?.estimated_time_minutes || 30,
        },
      };
    } catch (error) {
      console.error("Error analyzing SOP with AI:", error);
      throw new Error("Failed to analyze SOP content");
    }
  }

  /**
   * Generate vector embedding for semantic search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await getOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate text embedding");
    }
  }

  /**
   * Find related SOPs using semantic similarity
   */
  async findRelatedSOPs(
    currentSopId: string,
    embedding: number[],
    organizationId: string,
    limit: number = 5,
  ): Promise<string[]> {
    // This would require a vector database like Pinecone, Weaviate, or pgvector
    // For now, return empty array - implement with your chosen vector DB
    console.log("Finding related SOPs for:", currentSopId);
    return [];
  }

  /**
   * Generate AI-powered Q&A response for SOP content
   */
  async generateSOPResponse(
    question: string,
    sopContent: string,
    sopTitle: string,
    relatedContext?: string[],
  ): Promise<{
    answer: string;
    confidence: number;
    sources: Array<{ title: string; section: string }>;
    followUpQuestions: string[];
  }> {
    try {
      const contextText = relatedContext ? relatedContext.join("\n\n") : "";

      const prompt = `
You are an AI assistant helping gym staff understand Standard Operating Procedures (SOPs). 

Main SOP:
Title: ${sopTitle}
Content: ${sopContent}

Additional Context:
${contextText}

Question: ${question}

Please provide:
1. A clear, actionable answer based on the SOP content
2. Confidence level (0-1) in your response
3. Specific sections/sources referenced
4. 2-3 follow-up questions that might be helpful

Respond in JSON format:
{
  "answer": "Your detailed answer",
  "confidence": 0.95,
  "sources": [{"title": "SOP Title", "section": "Relevant section"}],
  "followUpQuestions": ["Question 1?", "Question 2?"]
}
`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert assistant for gym operations, helping staff understand and follow standard operating procedures. Always provide practical, actionable guidance based strictly on the provided SOP content.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        answer: result.answer || "Unable to generate response",
        confidence: result.confidence || 0.5,
        sources: result.sources || [{ title: sopTitle, section: "General" }],
        followUpQuestions: result.followUpQuestions || [],
      };
    } catch (error) {
      console.error("Error generating SOP response:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  /**
   * Auto-generate training quiz questions based on SOP content
   */
  async generateTrainingQuiz(
    sopContent: string,
    sopTitle: string,
    difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
  ): Promise<
    Array<{
      question: string;
      type: "multiple-choice" | "true-false" | "short-answer";
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }>
  > {
    try {
      const prompt = `
Generate a training quiz for the following SOP. Create 5-8 questions at ${difficulty} level.

SOP Title: ${sopTitle}
Content: ${sopContent}

Generate questions in this JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "type": "multiple-choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    },
    {
      "question": "True/False question",
      "type": "true-false",
      "correctAnswer": "true",
      "explanation": "Explanation"
    }
  ]
}

Focus on practical knowledge that staff need to follow the procedure correctly.
`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in creating training materials for gym staff. Generate practical quiz questions that test understanding of standard operating procedures.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const quiz = JSON.parse(response.choices[0].message.content || "{}");
      return quiz.questions || [];
    } catch (error) {
      console.error("Error generating training quiz:", error);
      throw new Error("Failed to generate training quiz");
    }
  }

  /**
   * Clean and format extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  }

  /**
   * Convert content to markdown format
   */
  formatAsMarkdown(content: string, title: string): string {
    const cleanContent = this.cleanText(content);

    // Basic formatting - you might want to enhance this
    let markdown = `# ${title}\n\n${cleanContent}`;

    // Add some basic structure detection
    markdown = markdown
      .replace(/^(\d+\.\s+)/gm, "\n$1") // Number lists
      .replace(/^([-•]\s+)/gm, "\n$1") // Bullet lists
      .replace(/^([A-Z][^.!?]*:)/gm, "\n## $1"); // Section headers

    return markdown;
  }
}
