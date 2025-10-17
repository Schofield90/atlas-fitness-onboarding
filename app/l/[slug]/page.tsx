import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Script from 'next/script';
import { PublishedComponentRenderer } from '@/app/components/landing-builder/PublishedComponentRenderer';

export const dynamic = 'force-dynamic';

interface LandingPageProps {
  params: { slug: string };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { slug } = params;

  const supabase = createServiceRoleClient();

  // Fetch the published landing page
  const { data: page, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !page) {
    notFound();
  }

  // Update view count
  await supabase
    .from('landing_pages')
    .update({ views_count: (page.views_count || 0) + 1 })
    .eq('id', page.id);

  // Check if analytics is enabled
  const analyticsEnabled = page.settings?.analytics_enabled !== false;

  return (
    <>
      {/* Analytics tracking script */}
      {analyticsEnabled && (
        <>
          {/* Set page ID for analytics tracker */}
          <Script
            id="analytics-config"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.__ANALYTICS_PAGE_ID__ = '${page.id}';`,
            }}
          />

          {/* Load analytics tracker */}
          <Script
            src="/analytics-tracker.js"
            strategy="afterInteractive"
          />
        </>
      )}

      {/* SEO Meta Tags */}
      <head>
        <title>{page.meta_title || page.title || page.name}</title>
        <meta name="description" content={page.meta_description || page.description || ''} />
        {page.meta_keywords && (
          <meta name="keywords" content={page.meta_keywords.join(', ')} />
        )}

        {/* Open Graph */}
        {page.og_image && (
          <>
            <meta property="og:image" content={page.og_image} />
            <meta property="og:title" content={page.meta_title || page.title || page.name} />
            <meta property="og:description" content={page.meta_description || page.description || ''} />
          </>
        )}
      </head>

      {/* Custom styles from page settings */}
      {page.styles && Object.keys(page.styles).length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: JSON.stringify(page.styles) }} />
      )}

      {/* Landing page content */}
      <div className="landing-page">
        <LandingPageRenderer content={page.content} />
      </div>

      {/* Third-party tracking codes */}
      {page.tracking_codes && (
        <>
          {page.tracking_codes.google_analytics && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${page.tracking_codes.google_analytics}`}
                strategy="afterInteractive"
              />
              <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${page.tracking_codes.google_analytics}');
                  `,
                }}
              />
            </>
          )}

          {page.tracking_codes.facebook_pixel && (
            <Script
              id="facebook-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${page.tracking_codes.facebook_pixel}');
                  fbq('track', 'PageView');
                `,
              }}
            />
          )}
        </>
      )}
    </>
  );
}

/**
 * Landing page content renderer
 * Renders the JSONB content array into HTML components
 */
function LandingPageRenderer({ content }: { content: any[] }) {
  if (!content || !Array.isArray(content)) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">No content available</p>
    </div>;
  }

  return (
    <>
      {content.map((block: any, index: number) => (
        <PublishedComponentRenderer
          key={block.id || `block-${index}`}
          component={block}
        />
      ))}
    </>
  );
}
