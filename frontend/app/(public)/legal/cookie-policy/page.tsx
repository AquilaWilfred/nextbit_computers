export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small pieces of text sent by your web browser by a website that you visit. A cookie file is 
              stored in your web browser and allows the website or a third-party to recognize you and make your next visit 
              to the website easier and more useful.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Cookies</h2>
            <p className="text-muted-foreground mb-4">
              NextBit uses cookies for various purposes including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Authentication: To verify your identity and keep you logged in</li>
              <li>Preferences: To remember your preferences and settings</li>
              <li>Analytics: To understand how you use our website and improve our services</li>
              <li>Session Management: To manage your browsing session</li>
              <li>Security: To detect and prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies are necessary for the website to function properly. They enable core functionality such as 
                  security, network management, and accessibility.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Performance Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies collect information about how you use our website, such as which pages you visit most often, 
                  and whether you receive error messages.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Functional Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies allow us to remember your choices and provide enhanced, more personalized features.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Marketing Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies may be set by our advertising partners and are used to build a profile of your interests 
                  and show you relevant adverts on other sites.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Managing Cookies</h2>
            <p className="text-muted-foreground">
              Most web browsers allow some control of most cookies through the browser settings. To find out more about 
              cookies, including how to see what cookies have been set and how to manage and delete them, visit 
              www.allaboutcookies.org.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              In some special cases we also use cookies provided by trusted third parties. The following third parties may 
              set cookies on your machine:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
              <li>Analytics providers (to understand website usage)</li>
              <li>Payment processors (to handle transactions securely)</li>
              <li>Content delivery networks (to optimize performance)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Cookie Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies 
              we use or for other operational, legal or regulatory reasons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about our use of cookies or other technologies, please contact us at support@nextbit.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
