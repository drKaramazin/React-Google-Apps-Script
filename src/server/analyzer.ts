interface OpenAiEntity {
  id: string;
}

interface OpenAiRun extends OpenAiEntity {
  status: string;
}

export const apiKey = (): string => {
  return 'sk-svcacct-8cbgc2dwc89cjMBVP3mdVoov7_g5xdSpHkzGt0-roV7AkQQ9ixjZNY1LgZCFpT3BlbkFJ_z5uvcskKR9bP8OzQuZLHdrEkkQDesgpwPJ5VLNpswEqyQer720E_jzqk45AA';
};

export const authHeader = (): { Authorization: string } => {
  return {
    Authorization: `Bearer ${apiKey()}`,
  };
};

export const apiURL = () => {
  return 'https://api.openai.com/v1/';
};

export const model = (): string => {
  return 'gpt-4o-mini';
};

export const assistantV2Header = () => {
  return {
    'OpenAI-Beta': 'assistants=v2',
  };
};

const fetchAIRequest = <ResponseType>(
  uri: string,
  options?: {
    payload?: object;
    additionalHeaders?: object;
    methodOption?: 'get' | 'post';
  }
): ResponseType => {
  const method = options?.methodOption || 'post';
  try {
    const response = UrlFetchApp.fetch(`${apiURL()}${uri}`, {
      method,
      contentType: 'application/json',
      payload: options?.payload ? JSON.stringify(options.payload) : undefined,
      headers: {
        ...authHeader(),
        ...options?.additionalHeaders,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Response status: ${response.getContentText()}`);
    }

    return JSON.parse(response.getContentText());
  } catch (e: unknown) {
    throw new Error((e as Error).toString());
  }
};

export const analyze = async (fileId: string) => {
  const assistant = fetchAIRequest<OpenAiEntity>('assistants', {
    payload: {
      model: model(),
      instructions: 'You are the speaker.',
      tools: [{ type: 'file_search' }],
    },
    additionalHeaders: assistantV2Header(),
  });

  const vectorStore = fetchAIRequest<OpenAiEntity>('vector_stores', {
    additionalHeaders: assistantV2Header(),
  });

  fetchAIRequest(`vector_stores/${vectorStore.id}/files`, {
    payload: {
      file_id: fileId,
    },
    additionalHeaders: assistantV2Header(),
  });

  fetchAIRequest(`assistants/${assistant.id}`, {
    payload: {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    },
    additionalHeaders: assistantV2Header(),
  });

  const thread = fetchAIRequest<OpenAiEntity>('threads', {
    payload: {
      messages: [
        {
          role: 'user',
          content: 'give a brief summary of the file',
          attachments: [
            {
              file_id: fileId,
              tools: [{ type: 'file_search' }],
            },
          ],
        },
      ],
    },
    additionalHeaders: assistantV2Header(),
  });

  const run = fetchAIRequest<OpenAiRun>(
    `threads/${thread.id}/runs?include[]=step_details.tool_calls[*].file_search.results[*].content`,
    {
      payload: {
        model: model(),
        assistant_id: assistant.id,
      },
      additionalHeaders: assistantV2Header(),
    }
  );

  return {
    threadId: thread.id,
    runId: run.id,
    runStatus: run.status,
  };
};

export const status = async (threadId: string, runId: string) => {
  return fetchAIRequest(`threads/${threadId}/runs/${runId}`, {
    methodOption: 'get',
    additionalHeaders: assistantV2Header(),
  });
};

export const messages = async (threadId: string) => {
  return fetchAIRequest(`threads/${threadId}/messages`, {
    methodOption: 'get',
    additionalHeaders: assistantV2Header(),
  });
};

export const placeSlides = (content: string[]) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const slide of SlidesApp.getActivePresentation().getSlides()) {
    slide.remove();
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const message of content) {
    const slide = SlidesApp.getActivePresentation().appendSlide();
    slide.insertTextBox(
      message,
      0,
      0,
      SlidesApp.getActivePresentation().getPageWidth(),
      SlidesApp.getActivePresentation().getPageHeight()
    );
  }
};
