import { Suspense } from "react";
import { DanishMEPVotesChart } from "@/components/danish-mep-votes-chart";

export const metadata = {
  title: "Danske MEP'ers brud med partigruppen",
};

export default function DanishMEPVotesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Danske MEP&apos;ers brud med partigruppen
        </h1>
        <p className="text-gray-600 mb-8">
          Oversigt over hvornår danske MEP&apos;er stemmer imod deres politiske
          gruppes flertal i Europa-Parlamentet. Klik på en MEP for at se
          detaljerede afstemninger og hvem de stemmer sammen med ved brud.
        </p>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          }
        >
          <DanishMEPVotesChart />
        </Suspense>
      </div>
    </div>
  );
}
