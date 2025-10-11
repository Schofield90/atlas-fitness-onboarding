import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/app/lib/supabase/server';
import Script from 'next/script';

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
        <div key={index} id={block.id || `block-${index}`}>
          <ComponentRenderer component={block} />
        </div>
      ))}
    </>
  );
}

/**
 * Component renderer - renders individual components from the content array
 * This is a simplified version - in production, you'd have specific renderers
 * for each component type (hero, features, testimonials, CTA, etc.)
 */
function ComponentRenderer({ component }: { component: any }) {
  const { type, props } = component;

  // Simplified rendering - you'd expand this based on your component library
  switch (type) {
    case 'header':
      return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">{props.logoText}</div>
            <nav className="hidden md:flex space-x-6">
              {props.menuItems?.map((item: any, i: number) => (
                <a key={i} href={item.href} className="text-gray-700 hover:text-blue-600">
                  {item.label}
                </a>
              ))}
            </nav>
            {props.ctaButton && (
              <a
                href={props.ctaButton.href}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                {props.ctaButton.label}
              </a>
            )}
          </div>
        </header>
      );

    case 'hero':
      return (
        <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-4">{props.title}</h1>
            <p className="text-xl mb-4">{props.subtitle}</p>
            {props.description && <p className="text-lg mb-8 text-blue-100">{props.description}</p>}
            {props.primaryButton && (
              <a
                href={props.primaryButton.href}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
                data-conversion="true"
                data-conversion-type="cta_click"
              >
                {props.primaryButton.label}
              </a>
            )}
          </div>
        </section>
      );

    case 'features':
      return (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">{props.title}</h2>
            {props.subtitle && <p className="text-center text-gray-600 mb-12">{props.subtitle}</p>}
            <div className="grid md:grid-cols-3 gap-8">
              {props.features?.map((feature: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'form':
      return (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-md">
            <h2 className="text-3xl font-bold text-center mb-8">{props.heading}</h2>
            <form className="bg-white p-8 rounded-lg shadow-md">
              {props.fields?.map((field: any, i: number) => (
                <div key={i} className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                data-conversion="true"
                data-conversion-type="form_submit"
              >
                {props.submitText || 'Submit'}
              </button>
            </form>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="py-16 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">{props.title}</h2>
            <p className="text-xl mb-8">{props.description}</p>
            {props.primaryButton && (
              <a
                href={props.primaryButton.href}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
                data-conversion="true"
                data-conversion-type="cta_click"
              >
                {props.primaryButton.label}
              </a>
            )}
          </div>
        </section>
      );

    case 'text':
      return (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: props.content }}
            />
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">{props.title}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {props.testimonials?.map((testimonial: any, i: number) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    {testimonial.image && (
                      <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4" />
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}{testimonial.company && `, ${testimonial.company}`}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'pricing':
      return (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">{props.title}</h2>
            {props.subtitle && <p className="text-center text-gray-600 mb-12">{props.subtitle}</p>}
            <div className="grid md:grid-cols-3 gap-8">
              {props.plans?.map((plan: any, i: number) => (
                <div key={i} className={`border rounded-lg p-8 ${plan.highlighted ? 'border-blue-600 shadow-xl' : 'border-gray-200'}`}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.features?.map((feature: string, j: number) => (
                      <li key={j} className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.ctaUrl}
                    className={`block text-center py-3 px-6 rounded-lg font-semibold ${plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">{props.title}</h2>
            <div className="space-y-4">
              {props.faqs?.map((faq: any, i: number) => (
                <details key={i} className="bg-white rounded-lg p-6">
                  <summary className="font-semibold cursor-pointer">{faq.question}</summary>
                  <p className="mt-4 text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );

    case 'footer':
      return (
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-bold mb-4">{props.companyName}</h3>
                {props.description && <p className="text-gray-400">{props.description}</p>}
              </div>
              {props.links?.map((section: any, i: number) => (
                <div key={i}>
                  <h4 className="font-semibold mb-4">{section.title}</h4>
                  <ul className="space-y-2">
                    {section.items?.map((item: any, j: number) => (
                      <li key={j}>
                        <a href={item.href} className="text-gray-400 hover:text-white">{item.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {props.social && (
              <div className="border-t border-gray-800 pt-8 flex justify-center space-x-6">
                {props.social.map((social: any, i: number) => (
                  <a key={i} href={social.url} className="text-gray-400 hover:text-white">
                    {social.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </footer>
      );

    default:
      // Render raw HTML if provided
      if (props.html) {
        return <div dangerouslySetInnerHTML={{ __html: props.html }} />;
      }

      // Fallback rendering
      return (
        <div className="py-8 px-4">
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(component, null, 2)}
          </pre>
        </div>
      );
  }
}
