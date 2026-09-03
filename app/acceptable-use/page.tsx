import LegalPage from "@/components/LegalPage";

export default function AcceptableUse() {
  return (
    <LegalPage title="Acceptable Use Policy" updated="February 2025">
      <h2 className="text-lg font-bold text-ink">1. Permitted use</h2>
      <p>
        SugarMax AI is provided for personal, lawful use — estimating the sugar and nutrition of your meals.
      </p>

      <h2 className="text-lg font-bold text-ink">2. Prohibited conduct</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Attempting to bypass, automate, or exceed your scan allowance.</li>
        <li>Interfering with payments, subscription state, or scan counters.</li>
        <li>Uploading unlawful, obscene, or infringing content.</li>
        <li>Attempting to access another user's data or administrative functions.</li>
        <li>Reverse engineering, scraping, or probing the service beyond normal use.</li>
        <li>Misusing the service to defraud, or providing false payment information.</li>
      </ul>

      <h2 className="text-lg font-bold text-ink">3. Enforcement</h2>
      <p>
        We may suspend or terminate accounts that violate this policy, without refund, and cooperate with
        law enforcement where required.
      </p>
    </LegalPage>
  );
}