import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export default function AboutPage() {
  return (
    <LegalPage title="About SugarMax AI" updated="February 2025">
      <h2 className="text-lg font-bold text-ink">Scan your meal. Know your sugar.</h2>
      <p>
        SugarMax AI is a meal intelligence app that makes understanding the sugar in your meal as simple as
        taking a photo. We use AI to identify the foods on your plate, estimate portions, and estimate sugar
        and nutritional values — without requiring you to search for every ingredient.
      </p>

      <h2 className="text-lg font-bold text-ink">How it works</h2>
      <ol className="list-inside list-decimal space-y-1">
        <li>Open the app and take or upload a photo of your meal.</li>
        <li>Our AI identifies the foods and estimates serving sizes.</li>
        <li>See estimated sugar, calories, carbs, protein, and more.</li>
        <li>Your meals are saved so you can track your history.</li>
      </ol>

      <h2 className="text-lg font-bold text-ink">A note on estimates</h2>
      <p>
        All values are AI-generated estimates based on the image and standard food data. They are not
        medical measurements and can vary with ingredients, preparation, and portion size. SugarMax AI is not
        a substitute for professional medical or nutritional advice.
      </p>

      <div className="mt-6">
        <Link href="/onboarding" className="btn-primary">Try SugarMax AI</Link>
      </div>
    </LegalPage>
  );
}