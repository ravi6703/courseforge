// Content Quality Pipeline for CourseForge
// Integrates: AI Quality Scoring + Plagiarism Detection (Copyleaks)

export interface QualityCheckResult {
  overallScore: number; // 0-100
  plagiarismScore: number; // 0-100 (100 = fully original)
  aiDetectionScore: number; // 0-100 (percentage likely AI-generated)
  readabilityScore: number; // 0-100
  factualAccuracyFlag: boolean;
  suggestions: string[];
  plagiarismSources: PlagiarismSource[];
  status: 'pending' | 'checking' | 'passed' | 'flagged' | 'failed';
}

export interface PlagiarismSource {
  url: string;
  matchPercentage: number;
  matchedText: string;
}

export interface ContentDepthAssessment {
  score: number;
  suggestions: string[];
}

export interface QualityThresholds {
  minReadability: number;
  minLength: number;
  maxPlagiarism: number;
}

/**
 * Calculate Flesch-Kincaid readability score locally (0-100)
 * Score interpretation:
 * 90-100: Very Easy (5th grade)
 * 80-89: Easy (6th grade)
 * 70-79: Fairly Easy (7th grade)
 * 60-69: Standard (8th-9th grade)
 * 50-59: Fairly Difficult (10th-12th grade)
 * 30-49: Difficult (College)
 * 0-29: Very Difficult (College graduate)
 */
export function calculateReadabilityScore(text: string): number {
  // Remove extra whitespace and normalize
  const cleanText = text.trim().replace(/\s+/g, ' ');

  if (cleanText.length === 0) {
    return 0;
  }

  // Count sentences (split on . ! ?)
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  // Count words
  const words = cleanText.split(/\s+/);
  const wordCount = words.length;

  // Count syllables
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word.toLowerCase());
  }

  // Flesch-Kincaid Reading Ease formula:
  // 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
  if (wordCount === 0 || sentenceCount === 0) {
    return 0;
  }

  const score =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (syllableCount / wordCount);

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in a word using basic heuristic
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');

  if (word.length <= 3) {
    return 1;
  }

  let count = 0;
  let previousWasVowel = false;

  for (const char of word) {
    const isVowel = 'aeiouy'.includes(char);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent e
  if (word.endsWith('e')) {
    count--;
  }

  // Adjust for le
  if (word.endsWith('le') && !word.endsWith('ble')) {
    count++;
  }

  return Math.max(1, count);
}

/**
 * Assess content depth based on type and return score with suggestions
 */
export function assessContentDepth(
  content: string,
  contentType: string
): ContentDepthAssessment {
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  const lineCount = content.split('\n').length;
  const suggestions: string[] = [];
  let score = 100;

  const thresholds = getQualityThresholds(contentType);

  // Check minimum length
  if (wordCount < thresholds.minLength) {
    score -= 30;
    suggestions.push(
      `Content is ${wordCount} words but should be at least ${thresholds.minLength} words for a ${contentType}.`
    );
  }

  // Content-type specific checks
  switch (contentType.toLowerCase()) {
    case 'video_script':
      // Video scripts should have intro/conclusion/clear sections
      if (!hasIntroduction(content)) {
        score -= 15;
        suggestions.push('Add a clear introduction to your video script.');
      }
      if (!hasConclusion(content)) {
        score -= 15;
        suggestions.push('Add a clear conclusion to your video script.');
      }
      if (lineCount < 10) {
        score -= 10;
        suggestions.push(
          'Consider breaking your script into more distinct sections or paragraphs.'
        );
      }
      break;

    case 'reading':
      // Readings should have structure with headings
      const headingCount = (content.match(/^#+\s/gm) || []).length;
      if (headingCount === 0) {
        score -= 20;
        suggestions.push(
          'Add markdown headings (# ## ###) to structure your reading material.'
        );
      }
      if (wordCount < thresholds.minLength * 1.2) {
        score -= 10;
        suggestions.push('Readings benefit from more detailed explanations.');
      }
      break;

    case 'quiz_question':
      // Quiz questions should have clear options
      const options = (content.match(/^[-*]\s/gm) || []).length;
      if (options < 4) {
        score -= 25;
        suggestions.push(
          'Quiz questions should have at least 4 answer options.'
        );
      }
      if (wordCount < 20) {
        score -= 15;
        suggestions.push(
          'Quiz questions should be more detailed and specific.'
        );
      }
      break;

    case 'assessment':
      // Assessments should have learning objectives and rubric
      if (
        !content.toLowerCase().includes('objective') &&
        !content.toLowerCase().includes('learning')
      ) {
        score -= 20;
        suggestions.push(
          'Include clear learning objectives in your assessment.'
        );
      }
      if (
        !content.toLowerCase().includes('rubric') &&
        !content.toLowerCase().includes('criteria')
      ) {
        score -= 20;
        suggestions.push(
          'Include a clear rubric or grading criteria in your assessment.'
        );
      }
      break;

    default:
      // Generic content checks
      if (lineCount < 3) {
        score -= 15;
        suggestions.push('Add more detail and structure to your content.');
      }
  }

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));

  return { score: finalScore, suggestions };
}

/**
 * Check if content has an introduction
 */
function hasIntroduction(content: string): boolean {
  const intro = content.substring(0, Math.min(500, content.length));
  const introKeywords = [
    'welcome',
    'introduction',
    'intro',
    'overview',
    'start',
    'begin',
  ];
  return introKeywords.some((keyword) =>
    intro.toLowerCase().includes(keyword)
  );
}

/**
 * Check if content has a conclusion
 */
function hasConclusion(content: string): boolean {
  const conclusion = content.substring(Math.max(0, content.length - 500));
  const conclusionKeywords = [
    'conclusion',
    'summary',
    'thanks',
    'thank you',
    'goodbye',
    'end',
    'finally',
    'in conclusion',
  ];
  return conclusionKeywords.some((keyword) =>
    conclusion.toLowerCase().includes(keyword)
  );
}

/**
 * Get quality thresholds for different content types
 */
export function getQualityThresholds(contentType: string): QualityThresholds {
  const typeMap: Record<string, QualityThresholds> = {
    video_script: {
      minReadability: 60,
      minLength: 800,
      maxPlagiarism: 5,
    },
    reading: {
      minReadability: 60,
      minLength: 1000,
      maxPlagiarism: 5,
    },
    quiz_question: {
      minReadability: 70,
      minLength: 20,
      maxPlagiarism: 10,
    },
    assessment: {
      minReadability: 50,
      minLength: 500,
      maxPlagiarism: 5,
    },
    default: {
      minReadability: 50,
      minLength: 100,
      maxPlagiarism: 10,
    },
  };

  return typeMap[contentType.toLowerCase()] || typeMap.default;
}

/**
 * Run comprehensive content quality checks (local only, no API calls)
 * Returns preliminary quality result without plagiarism/AI detection
 * (those require API calls in the route handler)
 */
export async function checkContentQuality(
  content: string,
  contentType: string
): Promise<QualityCheckResult> {
  // Calculate readability score
  const readabilityScore = calculateReadabilityScore(content);

  // Assess content depth
  const depthAssessment = assessContentDepth(content, contentType);

  // Get thresholds for this content type
  const thresholds = getQualityThresholds(contentType);

  // Build suggestions
  const suggestions: string[] = [...depthAssessment.suggestions];

  // Add readability suggestions
  if (readabilityScore < thresholds.minReadability) {
    suggestions.push(
      `Readability score is ${readabilityScore}. Try using shorter sentences or simpler words.`
    );
  }

  // Determine initial status based on local checks
  const passesPreliminary =
    readabilityScore >= thresholds.minReadability &&
    depthAssessment.score >= 70;

  // Calculate overall score from local checks
  const overallScore = Math.round((readabilityScore * 0.4 + depthAssessment.score * 0.6) / 2);

  return {
    overallScore,
    plagiarismScore: 100, // Placeholder until plagiarism check API is called
    aiDetectionScore: 50, // Placeholder until AI detection API is called
    readabilityScore,
    factualAccuracyFlag: false,
    suggestions,
    plagiarismSources: [],
    status: passesPreliminary ? 'checking' : 'flagged',
  };
}
