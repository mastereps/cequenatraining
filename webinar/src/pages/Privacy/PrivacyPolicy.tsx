import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";
const PrivacyPolicy = () => {
  return (
    <section className="privacy_policy mt-40 min-[1100px]:max-w-[1100px] mx-auto">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="mb-10">
          This Privacy Policy explains how we collect, use, and protect personal
          information from visitors, webinar attendees, and people who purchase
          or read our books.
        </p>
        <h2 className="text-xl mb-2">Information we collect</h2>
        <p>
          We collect personal information when you register for a webinar,
          download materials, purchase a book, or interact with our site.
        </p>
        <ul className="list-inside list-disc space-y-3 mb-10">
          <li>
            Contact details such as name, email address, and phone number.
          </li>
          <li>
            Registration and order details for webinars and books, including
            billing, shipping (if needed), and access preferences.
          </li>
          <li>
            Payment information processed securely by our payment providers (we
            do not store full payment details).
          </li>
          <li>
            Communications you send us, such as questions, feedback, or support
            requests.
          </li>
          <li>
            Usage data, such as page views, downloads, and device information,
            to help us understand how our site and webinar content are used.
          </li>
        </ul>
        <h2 className="text-xl mb-2">How we use information</h2>
        <ul className="list-inside list-disc space-y-3 mb-10">
          <li>
            Deliver webinar access, reminders, replays, certificates, and
            related resources.
          </li>
          {/* <li>
            Process book orders, provide downloads for digital products, and
            coordinate shipping for physical books.
          </li> */}
          <li>Respond to questions, support requests, and feedback.</li>
          <li>
            Send updates about new webinars, book releases, or changes to your
            registrations and orders (you can opt out of marketing at any time).
          </li>
          <li>
            Improve our website, webinar experience, and book offerings by
            analyzing aggregate trends and performance.
          </li>
        </ul>
        <h2 className="text-xl mb-2">Sharing your information</h2>
        <p className="mb-10">
          We share personal information only with trusted service providers who
          help us operate our webinars, process payments, manage email
          communications, ship books, and analyze site performance. We do not
          sell or rent your personal information.
        </p>
        <h2 className="text-xl mb-2">Cookies and tracking</h2>
        <p className="mb-10">
          We use cookies and similar technologies to remember preferences,
          maintain session security, and measure site and webinar performance.
          You can control cookies through your browser settings, but some
          features may not function properly without them.
        </p>
        <h2 className="text-xl mb-2">Data security and retention</h2>
        <p className="mb-10">
          We take reasonable steps to protect your information from unauthorized
          access or disclosure and retain it only as long as needed for the
          purposes described in this policy or as required by law.
        </p>
        <h2 className="text-xl mb-2">Your choices</h2>
        <p className="mb-10">
          You may update your contact details, unsubscribe from marketing
          emails, or request access to or deletion of your personal information
          by contacting us using the details below.
        </p>
        <h2 className="text-xl mb-2">Changes to this policy</h2>
        <p className="mb-10">
          We may update this Privacy Policy to reflect changes in our webinars
          or books. We encourage you to review it periodically. Your continued
          use of our site or participation in our webinars after any changes
          means you accept the updated policy.
        </p>
        <h2 className="text-xl mb-2">Contact us</h2>
        <p className="mb-10">
          If you have any questions about this Privacy Policy or our data
          practices, please contact us at our{" "}
          <Link
            to="/contact"
            className="underline underline-offset-4 hover:text-lantern"
          >
            support email
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

export default PrivacyPolicy;
