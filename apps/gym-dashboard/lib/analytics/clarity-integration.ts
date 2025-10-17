/**
 * Microsoft Clarity Integration Service
 * Handles script injection and basic data fetching
 */

export interface ClarityConfig {
  projectId: string;
  cookieConsent?: boolean;
  maskSensitiveData?: boolean;
}

export interface ClarityAnalytics {
  sessions: number;
  avgDuration: number; // seconds
  scrollDepth: number; // percentage
  conversionRate: number; // percentage
  bounceRate: number; // percentage
  topExitPercentage: number;
}

export class ClarityIntegrationService {
  /**
   * Generate Microsoft Clarity tracking script
   */
  static generateTrackingScript(projectId: string): string {
    return `
<!-- Microsoft Clarity -->
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "${projectId}");
</script>
    `.trim();
  }

  /**
   * Inject Clarity script into HTML
   */
  static injectIntoPage(html: string, projectId: string): string {
    const script = this.generateTrackingScript(projectId);

    // Try to inject before closing </head> tag
    if (html.includes('</head>')) {
      return html.replace('</head>', `  ${script}\n</head>`);
    }

    // Fallback: inject before closing </body> tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `  ${script}\n</body>`);
    }

    // If no head or body tags, prepend to content
    return script + '\n' + html;
  }

  /**
   * Validate Clarity project ID format
   */
  static validateProjectId(projectId: string): boolean {
    // Clarity project IDs are typically 10 alphanumeric characters
    const clarityIdPattern = /^[a-z0-9]{10}$/i;
    return clarityIdPattern.test(projectId);
  }

  /**
   * Generate Clarity dashboard URL for a project
   */
  static getDashboardUrl(projectId: string): string {
    return `https://clarity.microsoft.com/projects/view/${projectId}/dashboard`;
  }

  /**
   * Get heatmaps URL for a specific page
   */
  static getHeatmapsUrl(projectId: string, pageUrl?: string): string {
    const baseUrl = `https://clarity.microsoft.com/projects/view/${projectId}/heatmaps`;
    if (pageUrl) {
      return `${baseUrl}?url=${encodeURIComponent(pageUrl)}`;
    }
    return baseUrl;
  }

  /**
   * Get session recordings URL
   */
  static getRecordingsUrl(projectId: string): string {
    return `https://clarity.microsoft.com/projects/view/${projectId}/recordings`;
  }

  /**
   * Parse analytics from Clarity API response (placeholder - implement when API is available)
   * For MVP, this will be manually entered or use Clarity dashboard export
   */
  static parseAnalyticsData(rawData: any): ClarityAnalytics {
    // This is a placeholder structure
    // In production, parse actual Clarity API response
    return {
      sessions: rawData.sessions || 0,
      avgDuration: rawData.avgSessionDuration || 0,
      scrollDepth: rawData.scrollDepth || 0,
      conversionRate: rawData.conversionRate || 0,
      bounceRate: rawData.bounceRate || 0,
      topExitPercentage: rawData.topExitPercentage || 0,
    };
  }

  /**
   * Build React component for Clarity setup UI
   */
  static getSetupInstructions(): {
    title: string;
    steps: string[];
    helpUrl: string;
  } {
    return {
      title: 'Microsoft Clarity Setup',
      steps: [
        'Go to clarity.microsoft.com and sign in with your Microsoft account',
        'Click "Add new project" and enter your website details',
        'Copy the Project ID (10-character code)',
        'Paste the Project ID below to enable tracking',
        'Clarity will start collecting data within 2-3 hours',
      ],
      helpUrl: 'https://docs.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup',
    };
  }

  /**
   * Extract metrics that need AI analysis
   */
  static extractAnalysisMetrics(analytics: ClarityAnalytics): {
    sessions: number;
    avgDuration: string;
    scrollDepth: string;
    conversionRate: string;
    bounceRate: string;
  } {
    return {
      sessions: analytics.sessions,
      avgDuration: this.formatDuration(analytics.avgDuration),
      scrollDepth: `${analytics.scrollDepth.toFixed(1)}%`,
      conversionRate: `${analytics.conversionRate.toFixed(2)}%`,
      bounceRate: `${analytics.bounceRate.toFixed(1)}%`,
    };
  }

  /**
   * Format duration in human-readable format
   */
  private static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}

/**
 * TypeScript types for Clarity data
 */
export interface ClarityProject {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface ClarityHeatmapData {
  clickMap: { x: number; y: number; intensity: number }[];
  scrollMap: { depth: number; percentage: number }[];
  attentionMap: { x: number; y: number; duration: number }[];
}

export interface ClaritySession {
  id: string;
  duration: number;
  pages: number;
  events: number;
  timestamp: Date;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  country: string;
}
