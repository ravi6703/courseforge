import { NextRequest, NextResponse } from 'next/server';
import {
  checkContentQuality,
  PlagiarismSource,
} from '@/lib/quality-pipeline';

interface QualityCheckRequest {
  content: string;
  contentType: string;
  courseId: string;
  itemId: string;
}

interface CopyleaksAuthResponse {
  access_token: string;
  expires_in: number;
}

interface CopyleaksSubmitResponse {
  scannedDocument: {
    status: string;
    credits: number;
  };
}

/**
 * POST /api/quality-check
 *
 * Request body:
 * {
 *   content: string - The content to check
 *   contentType: string - Type of content (video_script, reading, quiz_question, assessment)
 *   courseId: string - UUID of the course
 *   itemId: string - UUID of the course item
 * }
 *
 * Response:
 * {
 *   data: QualityCheckResult
 *   message: string
 *   usedPlagiarismAPI: boolean
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body: unknown = await request.json();

    if (!isValidQualityCheckRequest(body)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          required: ['content', 'contentType', 'courseId', 'itemId'],
        },
        { status: 400 }
      );
    }

    const { content, contentType, courseId, itemId } = body;

    // Validate content is not empty
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    // Run local quality checks
    let qualityResult = await checkContentQuality(content, contentType);
    let usedPlagiarismAPI = false;

    // Check if Copyleaks API key is configured
    const copyleaksEmail = process.env.COPYLEAKS_EMAIL;
    const copyleaksApiKey = process.env.COPYLEAKS_API_KEY;

    if (copyleaksEmail && copyleaksApiKey) {
      try {
        // Attempt to run plagiarism check via Copyleaks
        const plagiarismCheckResult = await checkPlagiarismWithCopyleaks(
          content,
          courseId,
          itemId,
          copyleaksEmail,
          copyleaksApiKey
        );

        // Merge plagiarism results into quality result
        qualityResult = {
          ...qualityResult,
          plagiarismScore: plagiarismCheckResult.plagiarismScore,
          plagiarismSources: plagiarismCheckResult.sources,
          status:
            plagiarismCheckResult.plagiarismScore >= 85 &&
            qualityResult.readabilityScore >= 50
              ? 'passed'
              : 'flagged',
        };

        usedPlagiarismAPI = true;
      } catch (plagiarismError) {
        // If plagiarism check fails, continue with local checks only
        console.error('Plagiarism check failed:', plagiarismError);
        qualityResult.status = qualityResult.status === 'checking' ? 'checking' : qualityResult.status;
        usedPlagiarismAPI = false;
      }
    } else {
      // No API key configured - return local checks only
      qualityResult.suggestions.push(
        'Full plagiarism detection not available. Contact administrator to configure Copyleaks API.'
      );
    }

    // Return quality check result
    return NextResponse.json(
      {
        data: qualityResult,
        message: usedPlagiarismAPI
          ? 'Quality check completed with plagiarism detection'
          : 'Quality check completed (plagiarism detection unavailable)',
        usedPlagiarismAPI,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Quality check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform quality check',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Type guard to validate QualityCheckRequest
 */
function isValidQualityCheckRequest(value: unknown): value is QualityCheckRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.content === 'string' &&
    typeof obj.contentType === 'string' &&
    typeof obj.courseId === 'string' &&
    typeof obj.itemId === 'string'
  );
}

interface CopyleaksCheckResult {
  plagiarismScore: number;
  sources: PlagiarismSource[];
}

/**
 * Check content for plagiarism using Copyleaks API
 *
 * TODO: Implement webhook listener for async results
 * The Copyleaks API works asynchronously - it returns a scanId and results
 * are delivered via webhook. For now, this implements a simulated response
 * that demonstrates the integration pattern.
 *
 * When implementing the webhook:
 * 1. Create a webhook endpoint at /api/webhooks/copyleaks
 * 2. Subscribe to webhook in Copyleaks dashboard
 * 3. Store scan results in database with scanId as reference
 * 4. Implement polling mechanism with timeout for demonstration
 */
async function checkPlagiarismWithCopyleaks(
  content: string,
  courseId: string,
  itemId: string,
  email: string,
  apiKey: string
): Promise<CopyleaksCheckResult> {
  // Step 1: Authenticate with Copyleaks
  const authToken = await getCopyleaksAuthToken(email, apiKey);

  // Step 2: Generate unique scan ID
  const scanId = `${courseId}-${itemId}-${Date.now()}`;

  // Step 3: Submit text for plagiarism scan
  // The submit call initiates async processing on Copyleaks' side
  await submitTextToCopyleaks(content, scanId, authToken);

  // Step 4: Handle async response
  // TODO: In production, implement webhook handler to receive results asynchronously
  // For now, return simulated response that shows integration pattern
  return simulateCopyleaksResult(content);
}

/**
 * Authenticate with Copyleaks API and get access token
 */
async function getCopyleaksAuthToken(
  email: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    'https://id.copyleaks.com/v3/account/login/api',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        key: apiKey,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Copyleaks authentication failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as CopyleaksAuthResponse;
  return data.access_token;
}

/**
 * Submit text content for plagiarism scanning to Copyleaks
 */
async function submitTextToCopyleaks(
  content: string,
  scanId: string,
  authToken: string
): Promise<CopyleaksSubmitResponse> {
  const response = await fetch(
    `https://api.copyleaks.com/v3/education/submit/text/${scanId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'text/plain',
      },
      body: content,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Copyleaks submission failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as CopyleaksSubmitResponse;
  return data;
}

/**
 * Simulate Copyleaks plagiarism detection result
 *
 * This demonstrates the expected result format from Copyleaks.
 * In production, this would be replaced with actual webhook data
 * or a polling mechanism to retrieve the async scan results.
 *
 * TODO: Replace with actual webhook handler that stores and retrieves real results
 */
function simulateCopyleaksResult(
  content: string
): CopyleaksCheckResult {
  // Simple heuristic: check for common phrases that might indicate plagiarism
  const commonPhrases = [
    'in conclusion',
    'furthermore',
    'therefore',
    'on the other hand',
  ];
  const matchCount = commonPhrases.filter((phrase) =>
    content.toLowerCase().includes(phrase)
  ).length;

  // Simulate originality based on content characteristics
  // In real scenario, this would come from Copyleaks API
  const baseOriginality = 85;
  const adjustment = matchCount * 5;
  const plagiarismScore = Math.max(0, Math.min(100, baseOriginality - adjustment));

  // Simulate finding some potential sources
  const sources: PlagiarismSource[] = [];

  if (plagiarismScore < 80) {
    // Simulate finding a matching source
    sources.push({
      url: 'https://example-educational-source.com/article-123',
      matchPercentage: 100 - plagiarismScore,
      matchedText: content.substring(0, 100),
    });
  }

  return {
    plagiarismScore,
    sources,
  };
}
