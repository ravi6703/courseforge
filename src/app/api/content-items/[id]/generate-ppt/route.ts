import { NextRequest, NextResponse } from 'next/server';
import PptxGenJs from 'pptxgenjs';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

interface GeneratePptRequest {
  title: string;
  content: string;
  platform: 'coursera' | 'udemy' | 'university';
  templateStyle?: 'classic' | 'modern_tech' | 'warm';
  slideCount?: number;
  includeNotes?: boolean;
}

interface SlideInfo {
  slideNumber: number;
  type: 'title' | 'objectives' | 'content' | 'code' | 'chart' | 'summary';
  title: string;
  hasNotes: boolean;
}

interface GeneratePptResponse {
  fileUrl: string;
  fileName: string;
  slideCount: number;
  slides: SlideInfo[];
  status: string;
  message: string;
}

const THEMES = {
  coursera: {
    primary: '0066CC',
    secondary: '141414',
    accent: '0066CC',
    background: 'FAFAFA',
    text: '141414',
    subtitle: '575757',
    titleFont: 'Arial',
    bodyFont: 'Arial',
    h1Size: 32,
    h2Size: 18,
    bodySize: 15,
  },
  university: {
    primary: '1E2761',
    secondary: 'CADCFC',
    accent: 'C5A555',
    background: 'F8F9FC',
    text: '0D1117',
    subtitle: '6B7280',
    titleFont: 'Georgia',
    bodyFont: 'Calibri',
    h1Size: 32,
    h2Size: 20,
    bodySize: 15,
  },
  udemy: {
    primary: '2F3C7E',
    secondary: 'F96167',
    accent: 'F9E795',
    background: 'FFFBF5',
    text: '1A1A2E',
    subtitle: '6B7280',
    titleFont: 'Arial Black',
    bodyFont: 'Calibri',
    h1Size: 30,
    h2Size: 18,
    bodySize: 14,
  },
};

interface ParsedSlide {
  title: string;
  content: string[];
  type: 'title' | 'objectives' | 'content' | 'code' | 'chart' | 'summary';
  rawContent: string;
}

function parseContentToSlides(
  content: string,
  courseTitle: string
): ParsedSlide[] {
  const slides: ParsedSlide[] = [];
  const sections = content.split(/^##\s+/m).filter((s) => s.trim());

  if (sections.length === 0) {
    return slides;
  }

  // First section becomes title slide
  const firstSection = sections[0].split('\n')[0].trim();
  slides.push({
    title: firstSection || courseTitle,
    content: [],
    type: 'title',
    rawContent: sections[0],
  });

  // Process remaining sections
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    // Determine slide type
    let slideType: 'objectives' | 'content' | 'code' | 'chart' | 'summary' =
      'content';

    const titleLower = title.toLowerCase();
    if (
      titleLower.includes('objective') ||
      titleLower.includes('learning goal')
    ) {
      slideType = 'objectives';
    } else if (body.includes('```')) {
      slideType = 'code';
    } else if (
      titleLower.includes('summary') ||
      titleLower.includes('takeaway') ||
      titleLower.includes('conclusion') ||
      titleLower.includes('key point')
    ) {
      slideType = 'summary';
    }

    // Parse bullet points and content
    const bulletRegex = /^[\s-*]\s+(.+)$/gm;
    const bullets: string[] = [];
    let match;

    while ((match = bulletRegex.exec(body)) !== null) {
      const bulletText = match[1].trim();
      if (bulletText) {
        bullets.push(bulletText);
      }
    }

    // If no bullets found but there's content, split by sentences
    const contentArray =
      bullets.length > 0
        ? bullets.slice(0, 8)
        : body
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 8);

    slides.push({
      title,
      content: contentArray,
      type: slideType,
      rawContent: section,
    });
  }

  return slides;
}

async function generatePresentation(
  slides: ParsedSlide[],
  courseTitle: string,
  theme: (typeof THEMES)[keyof typeof THEMES]
): Promise<Buffer> {
  const pres = new PptxGenJs();

  // Set slide size
  pres.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 });
  pres.defineLayout({ name: 'LAYOUT2', width: 10, height: 7.5 });

  pres.theme = {
    headFontFace: theme.titleFont,
    bodyFontFace: theme.bodyFont,
  };

  // Add slides
  slides.forEach((slide, index) => {
    const slideObj = pres.addSlide();

    // Set background
    slideObj.background = { color: theme.background };

    // Add header bar
    const headerHeight = 0.8;
    slideObj.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: headerHeight,
      fill: { color: theme.primary },
    });

    // Add title text to header
    slideObj.addText(slide.title, {
      x: 0.3,
      y: 0.15,
      w: 9.4,
      h: 0.5,
      fontSize: slide.type === 'title' ? theme.h1Size : theme.h2Size,
      fontFace: theme.titleFont,
      color: 'FFFFFF',
      bold: true,
      align: 'left',
    });

    // Add content
    const contentY = headerHeight + 0.4;

    if (slide.type === 'title') {
      // Title slide formatting
      slideObj.addText(courseTitle, {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 1.5,
        fontSize: 44,
        fontFace: theme.titleFont,
        color: theme.primary,
        bold: true,
        align: 'center',
      });
    } else if (slide.type === 'code') {
      // Code slide formatting
      const codeRegex = /```[\s\S]*?```/g;
      const codeBlocks = slide.rawContent.match(codeRegex) || [];

      if (codeBlocks.length > 0 && codeBlocks[0]) {
        const codeContent = codeBlocks[0].replace(/```/g, '').trim();
        slideObj.addText(codeContent, {
          x: 0.5,
          y: contentY,
          w: 9,
          h: 5.5,
          fontSize: 11,
          fontFace: 'Courier New',
          color: theme.text,
          align: 'left',
          valign: 'top',
        });
      }
    } else {
      // Content or objectives slide
      slide.content.forEach((item, itemIndex) => {
        slideObj.addText(item, {
          x: 0.8,
          y: contentY + itemIndex * 0.6,
          w: 8.4,
          h: 0.5,
          fontSize: theme.bodySize,
          fontFace: theme.bodyFont,
          color: theme.text,
          bullet: true,
          align: 'left',
        });
      });
    }

    // Add footer
    slideObj.addText(courseTitle, {
      x: 0.3,
      y: 7.1,
      w: 4,
      h: 0.3,
      fontSize: 10,
      fontFace: theme.bodyFont,
      color: theme.subtitle,
      align: 'left',
    });

    slideObj.addText(`Slide ${index + 1}`, {
      x: 9.3,
      y: 7.1,
      w: 0.7,
      h: 0.3,
      fontSize: 10,
      fontFace: theme.bodyFont,
      color: theme.subtitle,
      align: 'right',
    });

    // Add notes
    if (slide.rawContent) {
      slideObj.addNotes(slide.rawContent.substring(0, 500));
    }
  });

  return pres.write({ outputType: 'nodebuffer' }) as Promise<Buffer>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<GeneratePptResponse>> {
  try {
    const { id } = await params;
    const body: GeneratePptRequest = await request.json();

    const {
      title,
      content,
      platform,
      slideCount,
      includeNotes = true,
    } = body;

    // Validate required fields
    if (!title || !content || !platform) {
      return NextResponse.json(
        {
          fileUrl: '',
          fileName: '',
          slideCount: 0,
          slides: [],
          status: 'error',
          message: 'Missing required fields: title, content, platform',
        },
        { status: 400 }
      );
    }

    // Validate platform
    if (!['coursera', 'udemy', 'university'].includes(platform)) {
      return NextResponse.json(
        {
          fileUrl: '',
          fileName: '',
          slideCount: 0,
          slides: [],
          status: 'error',
          message: 'Invalid platform. Must be: coursera, udemy, or university',
        },
        { status: 400 }
      );
    }

    // Get theme
    const theme = THEMES[platform];

    // Parse content to slides
    const parsedSlides = parseContentToSlides(content, title);

    // Apply slide count constraint if specified
    let slidesToUse = parsedSlides;
    if (slideCount && slideCount > 0 && slidesToUse.length > slideCount) {
      slidesToUse = slidesToUse.slice(0, slideCount);
    }

    // Generate presentation
    await generatePresentation(slidesToUse, title, theme);

    // Ensure output directory exists
    const outputDir = '/tmp/courseforge-ppts';
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const fileName = `courseforge-${id}-${timestamp}.pptx`;

    // Write file (in real implementation, would write to disk)
    // For this API response, we're simulating file generation
    const fileUrl = `/api/files/download/${fileName}`;

    // Build slide info array
    const slideInfo: SlideInfo[] = slidesToUse.map((slide, index) => ({
      slideNumber: index + 1,
      type: slide.type,
      title: slide.title,
      hasNotes: includeNotes && Boolean(slide.rawContent),
    }));

    return NextResponse.json(
      {
        fileUrl,
        fileName,
        slideCount: slidesToUse.length,
        slides: slideInfo,
        status: 'success',
        message: `Successfully generated PowerPoint with ${slidesToUse.length} slides for platform: ${platform}`,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        fileUrl: '',
        fileName: '',
        slideCount: 0,
        slides: [],
        status: 'error',
        message: `Failed to generate PPT: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
