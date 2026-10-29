export interface RecommendationContext {
  workflowId?: string;
  errorType?: string;
  environment?: string;
  history?: Array<Record<string, unknown>>;
}

export interface Recommendation {
  title: string;
  summary: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
}

export class RecommendationEngine {
  static suggest(context: RecommendationContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (context.errorType === 'network') {
      recommendations.push({
        title: 'Validate upstream connectivity',
        summary: 'Check connectivity and timeout settings for the upstream service or dependency.',
        confidence: 0.8,
        priority: 'high',
      });
    }

    if (context.errorType === 'validation') {
      recommendations.push({
        title: 'Review payload contract',
        summary: 'Validate the message contract against the expected schema and required fields.',
        confidence: 0.85,
        priority: 'high',
      });
    }

    return recommendations;
  }
}
