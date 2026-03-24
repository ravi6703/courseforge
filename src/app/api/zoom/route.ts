import { NextRequest, NextResponse } from "next/server";

interface ZoomRequestBody {
  action: "create_meeting" | "get_recording" | "list_meetings";
  topic?: string;
  startTime?: string;
  duration?: number;
  meetingId?: string;
  courseId?: string;
  contentItemId?: string;
}

interface ZoomMeetingResponse {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  topic: string;
  startTime: string;
  duration: number;
  status: string;
  message: string;
}

interface ZoomListResponse {
  meetings: ZoomMeetingData[];
  status: string;
  message: string;
}

interface ZoomRecordingResponse {
  meetingId: string;
  recordingUrl: string;
  recordingId: string;
  topic: string;
  status: string;
  message: string;
}

interface ZoomMeetingData {
  meetingId: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
}

interface ZoomOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomCreateMeetingResponse {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  start_url?: string;
}

interface ZoomListMeetingsResponse {
  meetings: Array<{
    id: number;
    topic: string;
    start_time: string;
    duration: number;
    join_url: string;
  }>;
}

interface ZoomRecordingFile {
  id: string;
  download_url?: string;
}

interface ZoomRecordingResponseData {
  id: number;
  topic: string;
  recording_files: ZoomRecordingFile[];
}

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Zoom access token: ${errorText}`);
  }

  const data = (await response.json()) as ZoomOAuthResponse;
  return data.access_token;
}

async function createZoomMeeting(
  accessToken: string,
  topic: string,
  startTime: string,
  duration: number
): Promise<ZoomMeetingResponse> {
  const requestBody = {
    topic,
    type: 2,
    start_time: startTime,
    duration,
    timezone: "UTC",
  };

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Zoom meeting: ${errorText}`);
  }

  const data = (await response.json()) as ZoomCreateMeetingResponse;

  return {
    meetingId: data.id.toString(),
    joinUrl: data.join_url,
    startUrl: data.start_url || data.join_url,
    topic: data.topic,
    startTime: data.start_time,
    duration: data.duration,
    status: "success",
    message: "Meeting created successfully",
  };
}

async function listZoomMeetings(
  accessToken: string
): Promise<ZoomListResponse> {
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list Zoom meetings: ${errorText}`);
  }

  const data = (await response.json()) as ZoomListMeetingsResponse;

  const meetings: ZoomMeetingData[] = data.meetings.map((meeting) => ({
    meetingId: meeting.id.toString(),
    topic: meeting.topic,
    startTime: meeting.start_time,
    duration: meeting.duration,
    joinUrl: meeting.join_url,
  }));

  return {
    meetings,
    status: "success",
    message: "Meetings retrieved successfully",
  };
}

async function getZoomRecording(
  accessToken: string,
  meetingId: string
): Promise<ZoomRecordingResponse> {
  const response = await fetch(
    `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Zoom recording: ${errorText}`);
  }

  const data = (await response.json()) as ZoomRecordingResponseData;

  const recordingFile = data.recording_files[0];
  const recordingUrl = recordingFile?.download_url || "";
  const recordingId = recordingFile?.id || "";

  return {
    meetingId: data.id.toString(),
    recordingUrl,
    recordingId,
    topic: data.topic,
    status: "success",
    message: "Recording retrieved successfully",
  };
}

function createSimulatedMeetingResponse(
  topic: string,
  startTime: string,
  duration: number
): ZoomMeetingResponse {
  const meetingId = Math.random().toString(36).substring(2, 11);

  return {
    meetingId,
    joinUrl: `https://zoom.us/j/${meetingId}`,
    startUrl: `https://zoom.us/s/${meetingId}?startTime=${Date.now()}`,
    topic,
    startTime,
    duration,
    status: "simulated",
    message:
      "Zoom credentials not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to .env.local",
  };
}

function createSimulatedListResponse(): ZoomListResponse {
  return {
    meetings: [
      {
        meetingId: "123456789",
        topic: "Sample Course Recording",
        startTime: new Date().toISOString(),
        duration: 60,
        joinUrl: "https://zoom.us/j/123456789",
      },
    ],
    status: "simulated",
    message:
      "Zoom credentials not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to .env.local",
  };
}

function createSimulatedRecordingResponse(
  meetingId: string
): ZoomRecordingResponse {
  return {
    meetingId,
    recordingUrl: "https://zoom.us/recording/placeholder.mp4",
    recordingId: `recording_${meetingId}`,
    topic: "Sample Recording",
    status: "simulated",
    message:
      "Zoom credentials not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to .env.local",
  };
}

export async function POST(
  request: NextRequest
): Promise<
  NextResponse<
    ZoomMeetingResponse | ZoomListResponse | ZoomRecordingResponse
  >
> {
  let requestBody: ZoomRequestBody;
  try {
    requestBody = (await request.json()) as ZoomRequestBody;
  } catch {
    return NextResponse.json(
      {
        meetings: [],
        status: "error",
        message: "Invalid JSON in request body",
      } as ZoomListResponse,
      { status: 400 }
    );
  }

  const { action, topic, startTime, duration, meetingId } = requestBody;

  if (!action) {
    return NextResponse.json(
      {
        meetings: [],
        status: "error",
        message: "Action is required",
      } as ZoomListResponse,
      { status: 400 }
    );
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const hasCredentials = accountId && clientId && clientSecret;

  try {
    if (action === "create_meeting") {
      if (!topic || !startTime || typeof duration !== "number") {
        return NextResponse.json(
          {
            audioUrl: "",
            duration: 0,
            voiceId: "",
            status: "error",
            message:
              "Topic, startTime, and duration are required for create_meeting action",
          } as unknown as ZoomMeetingResponse,
          { status: 400 }
        );
      }

      if (!hasCredentials) {
        return NextResponse.json(
          createSimulatedMeetingResponse(topic, startTime, duration)
        );
      }

      const accessToken = await getZoomAccessToken();
      const result = await createZoomMeeting(
        accessToken,
        topic,
        startTime,
        duration
      );
      return NextResponse.json(result);
    }

    if (action === "list_meetings") {
      if (!hasCredentials) {
        return NextResponse.json(createSimulatedListResponse());
      }

      const accessToken = await getZoomAccessToken();
      const result = await listZoomMeetings(accessToken);
      return NextResponse.json(result);
    }

    if (action === "get_recording") {
      if (!meetingId) {
        return NextResponse.json(
          {
            meetings: [],
            status: "error",
            message: "Meeting ID is required for get_recording action",
          } as ZoomListResponse,
          { status: 400 }
        );
      }

      if (!hasCredentials) {
        return NextResponse.json(
          createSimulatedRecordingResponse(meetingId)
        );
      }

      const accessToken = await getZoomAccessToken();
      const result = await getZoomRecording(accessToken, meetingId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        meetings: [],
        status: "error",
        message: "Invalid action",
      } as ZoomListResponse,
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        meetings: [],
        status: "error",
        message: `Failed to process Zoom request: ${errorMessage}`,
      } as ZoomListResponse,
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<ZoomListResponse>> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const hasCredentials = accountId && clientId && clientSecret;

  try {
    if (!hasCredentials) {
      return NextResponse.json(createSimulatedListResponse());
    }

    const accessToken = await getZoomAccessToken();
    const result = await listZoomMeetings(accessToken);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        meetings: [],
        status: "error",
        message: `Failed to list meetings: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
