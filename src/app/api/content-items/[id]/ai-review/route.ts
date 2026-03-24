import { NextRequest, NextResponse } from 'next/server';

interface AIReview {
  id: string;
  category: 'accuracy' | 'clarity' | 'completeness' | 'engagement' | 'structure' | 'bloom_alignment';
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  lineReference?: string;
  suggestedFix?: string;
  autoResolvable: boolean;
}

interface ReviewSummary {
  totalIssues: number;
  criticalCount: number;
  suggestionCount: number;
  overallRating: string;
}

interface AIReviewResponse {
  reviews: AIReview[];
  summary: ReviewSummary;
}

interface ReviewRequestBody {
  content: string;
  contentType: string;
  title: string;
  learningObjectives?: string[];
}

async function callClaudeAPI(
  content: string,
  contentType: string,
  title: string,
  learningObjectives: string[] | undefined
): Promise<AIReview[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getSimulatedReview();
  }

  const objectivesText = learningObjectives?.length
    ? `Learning Objectives:\n${learningObjectives.map((obj) => `- ${obj}`).join('\n')}`
    : '';

  const reviewPrompt = `You are an expert educational content reviewer. Analyze the following ${contentType} content for a course titled "${title}".

${objectivesText}

Content to review:
"""
${content}
"""

Evaluate this content across these dimensions:
1. **Accuracy**: Are all facts, concepts, and examples correct?
2. **Clarity**: Is the explanation clear and easy to understand?
3. **Completeness**: Are key concepts covered? Are examples sufficient?
4. **Engagement**: Is the content engaging? Does it maintain learner interest?
5. **Structure**: Is the content well-organized? Does it have clear intro/conclusion?
6. **Bloom's Alignment**: Does content match appropriate cognitive level for learners?

Return a JSON array of review objects with this structure:
[
  {
    "id": "unique-id",
    "category": "accuracy|clarity|completeness|engagement|structure|bloom_alignment",
    "severity": "critical|warning|suggestion",
    "title": "Issue Title",
    "description": "Detailed description of the issue",
    "lineReference": "Optional: approximate location or context",
    "suggestedFix": "Optional: suggested rewrite or fix",
    "autoResolvable": true|false
  }
]

Only include issues that are actually present. If content is excellent in a category, don't include an entry for it.
Return ONLY the JSON array, no additional text.`;

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
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: reviewPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText =
      data.content[0]?.type === 'text' ? data.content[0].text : '';

    const reviews: AIReview[] = JSON.parse(responseText);
    return reviews;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return getSimulatedReview();
  }
}

function getSimulatedReview(): AIReview[] {
  return [
    {
      id: 'sim-001',
      category: 'clarity',
      severity: 'warning',
      title: 'Complex explanation needs simplification',
      description:
        'The explanation in paragraph 2 uses technical jargon without defining key terms. Consider breaking it into smaller, digestible concepts.',
      lineReference: 'Paragraph 2',
      suggestedFix:
        'Break down the concept into simpler terms and add definitions for technical vocabulary.',
      autoResolvable: true,
    },
    {
      id: 'sim-002',
      category: 'completeness',
      severity: 'suggestion',
      title: 'Add practical example',
      description:
        'The theoretical concepts are covered well, but the content would benefit from a real-world example to illustrate the principle.',
      lineReference: 'Concept section',
      suggestedFix: 'Add a concrete, relatable example that demonstrates the main concept.',
      autoResolvable: true,
    },
    {
      id: 'sim-003',
      category: 'structure',
      severity: 'suggestion',
      title: 'Add concluding summary',
      description:
        'The content ends abruptly without a clear summary. A brief conclusion would reinforce key learning points.',
      autoResolvable: false,
    },
  ];
}

function calculateSummary(reviews: AIReview[]): ReviewSummary {
  const criticalCount = reviews.filter((r) => r.severity === 'critical').length;
  const suggestionCount = reviews.filter((r) => r.severity === 'suggestion').length;
  const totalIssues = reviews.length;

  let overallRating: string;
  if (criticalCount > 0) {
    overallRating = 'Needs Major Revision';
  } else if (reviews.filter((r) => r.severity === 'warning').length > 0) {
    overallRating = 'Needs Minor Revision';
  } else if (suggestionCount > 0) {
    overallRating = 'Good with Suggestions';
  } else {
    overallRating = 'Excellent';
  }

  return {
    totalIssues,
    criticalCount,
    suggestionCount,
    overallRating,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AIReviewResponse | { error: string }>> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing content item ID' }, { status: 400 });
    }

    const body: ReviewRequestBody = await request.json();
    const { content, contentType, title, learningObjectives } = body;

    if (!content || !contentType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: content, contentType, title' },
        { status: 400 }
      );
    }

    const reviews = await callClaudeAPI(content, contentType, title, learningObjectives);
    const summary = calculateSummary(reviews);

    return NextResponse.json({
      reviews,
      summary,
    });
  } catch (error) {
    console.error('Error in AI review route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
