import { recordMinuteBucket } from "@/lib/health/record-bucket";

type AppHandler<TRequest extends Request, TContext> = (
  request: TRequest,
  context: TContext,
) => Promise<Response> | Response;

export function observeRoute<TRequest extends Request, TContext>(
  handler: AppHandler<TRequest, TContext>,
): AppHandler<TRequest, TContext> {
  return async (request, context) => {
    const start = Date.now();
    let status = 500;

    try {
      const response = await handler(request, context);
      status = response.status;
      return response;
    } catch (error) {
      status = 500;
      throw error;
    } finally {
      const path = new URL(request.url).pathname;
      void recordMinuteBucket({
        path,
        status,
        durationMs: Date.now() - start,
      });
    }
  };
}
