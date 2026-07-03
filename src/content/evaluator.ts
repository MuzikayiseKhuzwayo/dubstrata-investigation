export interface ContentMetrics {
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: number;
}

export interface ContentAsset {
  id: string;
  type: 'X' | 'VIDEO' | 'OUTREACH' | 'GEOPOLITICAL';
  topic: string;
  title: string;
  content: string;
  status: 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED';
  timestamp: number; // creation timestamp
  publishedAt?: number;
  intervals: {
    '1h'?: ContentMetrics;
    '2h'?: ContentMetrics;
    '6h'?: ContentMetrics;
    '12h'?: ContentMetrics;
  };
  engagementScore?: number; // Latest calculated score
}

export class ContentEvaluator {
  /**
   * Calculates the Engagement Score (E) based on the algorithmic formula of X.com
   * E = (10 * Replies + 5 * Retweets + 2 * Likes + 0.1 * Views) / (Views + 1)
   */
  public static calculateEngagementScore(metrics: ContentMetrics): number {
    const { views, likes, retweets, replies } = metrics;
    if (views < 0 || likes < 0 || retweets < 0 || replies < 0) {
      return 0.00;
    }
    const score = (10 * replies + 5 * retweets + 2 * likes + 0.1 * views) / (views + 1);
    return parseFloat(score.toFixed(4));
  }

  /**
   * Retrieves the latest logged interval metrics and updates the overall engagementScore of the asset
   */
  public static updateAssetScore(asset: ContentAsset): ContentAsset {
    const intervals: Array<'1h' | '2h' | '6h' | '12h'> = ['12h', '6h', '2h', '1h'];
    for (const key of intervals) {
      const metrics = asset.intervals[key];
      if (metrics) {
        asset.engagementScore = this.calculateEngagementScore(metrics);
        return asset;
      }
    }
    asset.engagementScore = 0.00;
    return asset;
  }
}
