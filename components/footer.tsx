export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-50 to-green-50 mt-auto">
      <div className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
            <p className="text-gray-600 leading-relaxed"><strong>Om EU-bureauets dataportal</strong><br />
              Dataportalen er udviklet af <a href="/om-eu-bureauet/" className="hover:text-blue-800 underline">EU-bureauet</a> i samarbejde med analysebureauet <a href="https://www.ogtal.dk/" target="_blank" className="hover:text-blue-800 underline">Analyse & Tal</a>.
              Dataportalen er en del af projektet &quot;Dataværktøjer og analyser: Få styr på Europa-Parlamentet&quot;,
              som har modtaget støtte fra <a href="https://slks.dk/omraader/folkeoplysning/europa-naevnet" target="_blank" className="hover:text-blue-800 underline">Europa-Nævnet</a>. Ansvar for indholdet er alene tilskudsmodtagers.
            </p>

          <div className="text-gray-600">
            <p className="font-semibold">Abonnér på vores nyhedsbrev</p>
            <p className="leading-relaxed">
              Modtag invitationer til EU-netværket i civilsamfundet og analyser af europæisk politik.
            </p>
<center>            <a
              href="https://www.eubureauet.dk/abonner-paa-vores-nyhedsbrev/"
              className="inline-block mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-800 hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Tilmeld
            </a></center>
          </div>
        </div>
      </div>
        <hr /><center className='text-gray-600'><a href="https://www.linkedin.com/company/eu-bureauet/" className="hover:text-blue-800 underline">LinkedIn</a> | <a href="https://www.facebook.com/profile.php?id=61573867791459" className="hover:text-blue-800 underline">Facebook</a> | <a href="https://www.eubureauet.dk/om-eu-bureauet/" className="hover:text-blue-800 underline">Om EU-bureauet</a></center>
    </footer>
  )
}