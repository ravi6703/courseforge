import { NextRequest, NextResponse } from 'next/server';

interface ResolveReviewRequestBody {
  reviewId: string;
  action: 'accept' | 'dismiss' | 'auto-fix';
  content: string;
  suggestedFix?: string;
}

interface ResolveReviewResponse {
  updatedContent: string;
  resolved: boolean;
}

async function applyAutoFix(
  content: string,
  suggestedFix: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return suggestedFix;
  }

  const fixPrompt = `You are a content editor. The original content is:

"""
${content}
"""

Apply the following fix/suggestion to improve the content:

"""
${suggestedFix}
"""

Return only the updated content text. Do not include explanations or markdown formatting. Return the complete updated content.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: fixPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const updatedContent =
      data.content[0]?.type === 'text' ? data.content[0].text : suggestedFix;

    return updatedContent;
  } catch (error) {
    console.error('Error calling Claude API for auto-fix:', error);
    return suggestedFix;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ResolveReviewResponse | { error: string }>> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing content item ID' }, { status: 400 });
    }

    const body: ResolveReviewRequestBody = await request.json();
    const { reviewId, action, content, suggestedFix } = body;

    if (!reviewId || !action || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewId, action, content' },
        { status: 400 }
      );
    }

    if (!['accept', 'dismiss', 'auto-fix'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: accept, dismiss, auto-fix' },
        { status: 400 }
      );
    }

    let updatedContent = content;
    let resolved = true;

    if (action === 'auto-fix') {
      if (!suggestedFix) {
        return NextResponse.json(
          { error: 'suggestedFix is required when action is auto-fix' },
          { status: 400 }
        );
      }

      updatedContent = await applyAutoFix(content, suggestedFix);
    } else if (action === 'accept' || action === 'dismiss') {
      updatedContent = content;
      resolved = true;
    }

    return NextResponse.json({
      updatedContent,
      resolved,
    });
  } catch (error) {
    console.error('Error in resolve review route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
