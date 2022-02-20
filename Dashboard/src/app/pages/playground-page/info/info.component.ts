import { Component } from '@angular/core';

@Component({
    selector: 'app-info',
    template: `
        <div
            class="info-container"
            style="min-height: auto"
            fxLayout="column"
            fxLayoutGap="1rem"
            fxLayoutAlign="space-around"
        >
            <div fxFlex="100">
                <mat-card>
                    <mat-card-title>
                        <h1>Informationen</h1>
                    </mat-card-title>
                    <mat-card-subtitle></mat-card-subtitle>

                    <mat-card-content class="mat-padding">
                        <h2>Was wie wo</h2>
                        <p>
                            Ein kleines Amateur-Bastelprojekt, um historische Daten, Simulationen für die Zukunft
                            und weitere Infos zur Impfkampagne gegen Covid-19 in Deutschland in einem Dashboard zusammenzuführen.<br>
                            Alles ist mit einer gewissen Skepsis zu betrachten, das hier ist schließlich keine offizielle Vorhersage.<br>
                            Wenn ihr etwas beitragen oder selbst mit dem Code rumspielen wollt, findet ihr alles auf <a href="https://github.com/Cov19-Impfvorhersage/cov19vaccsim">GitHub</a>.
                        </p>

                        <h2>Linksammlung weiterer Dashboards</h2>
                        <ul>
                            <li>
                                <a href="https://impfdashboard.de">Impfdashboard.de</a>
                                Offizielles Impfdashboard des RKI (und Datenquelle für dieses Dashboard)
                            </li>
                            <li>
                                <a href="https://www.zidatasciencelab.de/cov19vaccsim">Impfsimulation des Zi Datascience Lab</a>
                                Worauf diese Seite aufbaut
                            </li>
                            <li>
                                <a href="https://www.zidatasciencelab.de/covidimpfindex/">Impfindex-Dashboard des Zi Datascience Lab</a>
                                Analysen insbesondere zur Aufteilung Impfzentren / Arztpraxen
                            </li>
                        </ul>

                        <h2>Methodik der Simulation</h2>
                        <p>
                            Im groben basiert die Simulation auf dem Algorithmus des <a href="https://www.zidatasciencelab.de/cov19vaccsim">Impfdashboards des Zi Datascience Lab</a>.
                        </p>
                        <p>
                            In kurz:<br>
                            Für jede Woche werden mit den verfügbaren Impfdosen erst alle angesetzten Zweitimpfungen durchgeführt, mit dem Rest dann so viele Erstimpfungen wie möglich.<br>
                            Für genaue Details ist es vermutlich am besten, einfach direkt den <a href="https://github.com/Cov19-Impfvorhersage/cov19vaccsim/blob/master/Dashboard/src/app/simulation/simulation.ts">Quellcode der Simulation</a> zu lesen.
                        </p>
                        <h3>
                            Einschränkungen:
                        </h3>
                        <ul>
                            <li>
                                <b>Keine Simulation der Kapazitäten:</b><br>
                                Die Annahme ist, dass für jede verfügbare Impfdosis, für die sich eine impfwillige Person findet, sich auch ein Weg in den Arm auftut.
                                Hausärzt:innen impfen bereits mit und wenn genug da ist, tun das sicher gerne auch Betriebsärzt:innen, Tierärzt:innen, etc; zur Not auch in 24h-Schicht.<br>
                                Eine Kapazitätssimulation findet sich auf dem <a href="https://www.zidatasciencelab.de/cov19vaccsim">Impfdashboards des Zi Datascience Lab</a>
                            </li>
                            <li>
                                <b>Verzögertes Verfügbarwerden der Impfdosen:</b><br>
                                Auch wenn Impfdosen offiziell geliefert wurden, so müssen sie immer noch an die Einsatzorte verteilt werden.
                                Daraus ergibt sich seit Beginn der Kampagne eine 1 - 2-wöchige Verzögerung von Lieferung => Arm.
                                Dies gilt für ziemlich alle Länder und Staaten und wird hier simuliert, indem die gelieferten Dosen einfach erst in der darauffolgenden Woche verfügbar werden.
                                Sollte diese Annahme nicht stimmen (z.B. teilweise aktuell für BioNtech),
                                wird das durch die Nichtbehandlung negativer Lagerbestände teilweise ausgeglichen (siehe nächster Punkt).
                            </li>
                            <li>
                                <b>Lagerbestand an Impfdosen:</b><br>
                                Für den Beginn der Simulation wird der aktuelle Lagerbestand (mit verzögerter Verfügbarwerdung) der Impfdosen berechnet.
                                Dieser fließt, wenn der Schalter aktiviert wird, in die Simulation mit ein. Allerdings werden negative Lagerbestände
                                (aka. Lieferungen die entgegen der Annahme im Absatz darüber noch in der selben Woche verimpft wurden) einfach ignoriert.
                                Dadurch wird die Vorhersage für die nächsten Wochen besser, aber die Zahlen sind in der Summe am Ende theoretisch nicht mehr ganz korrekt.
                            </li>
                            <li>
                                <b>Zweitimpfungen:</b><br>
                                Zweitimpfungen werden entsprechend der RKI-Empfehlung angesetzt, allerdings ist die Warteschlange aus den historischen Daten nicht ganz berechenbar:<br>
                                Es kann zwar abgeschätzt werden, wie viele Zweitimpfungen nötig sind, wenn das Intervall für jede Person exakt nach STIKO-Empfehlungen angewendet wird;
                                aber teilweise werden kürzere Intervalle angewendet. Dies ist insbesondere der Fall, wenn die Simulation zu früheren Zeitpunkten gestartet wird,
                                da sie aktuell stets die letzten STIKO-Empfehlungen verwendet.
                            </li>
                            <li>
                                <b>Aufteilung der Bevölkerung:</b><br>
                                Um den Teil der Bevölkerung zu simulieren, der die Impfung erhalten wird, werden zunächst die Kontraindizierten abgezogen.
                                Dies sind vor allem alle unter 12 jährigen, da bisher keiner der Impfstoffe für diese Altersgruppe zugelassen wurde.
                                Anschließend wird vom Rest der Bevölkerung der Anteil Impfunwilliger abgezogen.
                                Dies ist für die meisten Berechnungen sinnvoll, insbesondere da die Umfragen zur Impfwilligkeit sich meist
                                auf die volljährige Bevölkerung beziehen und dies auch diejenigen sind, für die die Impfstoffe aktuell zugelassen sind.
                            </li>
                            <li>
                                <b>Impfbereitschaft:</b><br>
                                Die Impfwilligkeitsdaten aus den <a href="https://projekte.uni-erfurt.de/cosmo2020/">COSMO-Umfragen</a> werden wie folgt interpretiert:<br>
                                Die Antworten zur Impfbereitschaft zwischen 7 (auf jeden Fall impfen) und 1 (auf keinen Fall impfen) in die Gruppen:<br>
                                [7]: Impfwillig; [6,5]: Eher impfwillig; [4,3]: Eher impfunwillig (Impfzögerlich); [2,1]: Impfunwillig<br>
                                Der Anteil Impfunwilliger wird dabei als Standardeinstellung für die Impfwilligkeit verwendet, die Impfzögerlichen wie unten beschrieben.
                                Der restliche Teil wird homogen als impfbereit betrachtet.
                                Darüber hinaus wird die Impfbereitschaft aktuell als homogen für alle Alters- und Prioritätsgruppen angenommen,
                                <a href="https://assets.rrz.uni-hamburg.de/instance_assets/fakws/16982038/impfbereitschaft-nach-alter-de-en-733x414-a12762b14c33380471c46edd52d2e81c4b598036.jpg">
                                    was definitiv nicht der Realität entspricht,
                                </a> aber für die Darstellungen hier ausreichen dürfte.
                            </li>
                            <li>
                                <b>Impfzögerliche:</b><br>
                                Gegen Ende der Impfkampagne wird diese deutlich langsamer, da sich immer weniger impfwillige Leute finden.
                                Dies wird hier wie folgt simuliert:<br>
                                Während von den Impfwilligen jede Woche 100% bereit wären und von den Impfunwilligen 0%,
                                ist dies bei den Impfzögerlichen ein fließender Übergang zwischen 50% und 10%.
                                Die Zahlen sind komplett aus der Luft gegriffen, weil der Plot dann schön aussieht.
                            </li>
                            <li>
                                <b>Automatische Abschätzung der Impfwilligen pro Impfstoff:</b><br>
                                Inzwischen ist die Kampagne an einer Stelle an der die Impfungen mehr von der Impfbereitschaft abhängen als von den Impflieferungen.
                                Da dies jedoch pro Impfstoff sehr unterschiedlich ist (z.B. wird Astra-Zeneca kaum noch verimpft, während von BioNtech noch die meisten gelieferten Dosen weggehen),
                                wird hierfür eine der folgenden automatische Abschätzung verwendet:<br>
                                <u>Konstant:</u><br>
                                1) Über die letzten paar Wochen wird die durchschnittliche Anzahl an Erstimpfungen pro Impfstoff berechnet.<br>
                                2) Ebenso wird der Anteil dieser Erstimpfungen an den theoretisch möglichen Erstimpfungen (Lieferungen minus Zweitimpfungen) berechnet.<br>
                                Für die zukünftige Woche wird anschließend eine Linearkombination aus 1) und 2) (auf die Lieferungen der neuen Woche bezogen) verwendet,
                                je nach Wert von 2).<br>
                                <u>Exponentiell abfallend:</u><br>
                                Über die letzten paar Wochen wird für jeden Impfstoff ein exponentiell abfallendes (exp. <= 1) Modell berechnet.<br>
                                Dieses wird dann für die folgenden Wochen fortgeführt.<br>
                                Dieses Modell ergibt im Gegensatz zur konstanten Fortführung ein oberes Limit dafür, wie viele Leute sich insgesamt impfen lassen,
                                das unabhängig von der eingestellten Impfbereitschaft ist.<br>
                                Beide Abschätzungen machen allerdings nur ab Mitte Juli Sinn, daher sollte man diese deaktivieren, wenn man die Simulation zu einem früheren Zeitpunkt starten möchte.
                            </li>
                            <li>
                                <b>Simulation der Boosterimpfungen:</b><br>
                                Die Boosterimpfungen pro Woche werden aktuell ganz banal angesetzt als die Anzahl der Personen, die ein halbes Jahr vorher ihre vollständige Immunisierung erhalten haben.
                                Dabei werden aktuell Impflieferungsdaten ignoriert, da die Datenquelle nicht mehr ganz korrekt ist.
                                Außerdem wird ignoriert, dass J&J-Geimpfte die Boosterimpfung bereits nach ein paar Wochen erhalten können.
                                Sämtliche Boosterimpfungen werden mit BioNTech-Impfstoff angesetzt.
                            </li>
                            <li>
                                <b>Boosterimpfungen aufholen:</b><br>
                                Hier werden für jede Simulationswoche zusätzlich zu den neu hinzukommenden boosterwilligen Personen auch noch 30%
                                der noch nicht geboosterten boosterwilligen der vergangenen Wochen hinzugefügt, minimal wird aber so schnell aufgeholt wie die aktuelle Boostergeschwindigkeit beträgt.
                            </li>
                        </ul>


                        <h2>Datenquellen</h2>
                        <ul>
                            <li>
                                Historische Impf- und Lieferdaten stammen vom <a href="https://impfdashboard.de">Offiziellen Impfdashboard (impfdashboard.de)</a> und damit vom RKI & BMG.
                            </li>
                            <li>
                                Zukünftige Lieferpläne stammen vom <a href="https://www.zidatasciencelab.de/cov19vaccsim/">Zi Datascience Lab</a> und aus den <a href="https://www.bundesgesundheitsministerium.de/coronavirus/faq-covid-19-impfung.html">FAQ des BMG</a>.<br>
                                Aktuell (Ende Februar) sind allerdings nur konkrete Zahlen für Novavax verfügbar, da die Impfstoffe von BioNTech und Moderna genug auf Lager sind.
                                Für alle zukünftigen Wochen, für die keine Daten bekannt sind, werden daher einfach die letzten ungefähren Zahlen fortgeschrieben.
                            </li>
                            <li>
                                Daten zur Impfbereitschaft stammen von der <a href="https://projekte.uni-erfurt.de/cosmo2020/">COSMO Studie der Universität Erfurt</a>.
                            </li>
                            <li>
                                <a href="https://github.com/Cov19-Impfvorhersage/cov19vaccsim/tree/master/Dashboard/data">Sonstige Datensätze (Bevölkerung etc...) finden sich im GitHub Repo</a> mit ihren jeweiligen Quellen.
                            </li>
                        </ul>

                        <h2>Datenschutz usw...</h2>
                        <p>
                            Dies ist eine statische GitHub Page, dementsprechend gilt auch die <a href="https://docs.github.com/en/github/site-policy/github-privacy-statement">Privacy Policy von GitHub</a>.
                            Es werden keine Cookies verwendet und keine Tracker oder so eingebunden (aber Aufrufe gezählt).
                            Allerdings werden die oben genannten Datenquellen teilweise dynamisch (also vom Browser aus) eingebunden (dadurch sind sie automatisch immer auf dem neuesten Stand).<br>
                            D.h. der Browser fragt z.B. die Tabelle vom <a href="https://impfdashboard.de">impfdashboard.de</a> direkt an.
                        </p>
                    </mat-card-content>
                </mat-card>
            </div>
        </div>
    `,
    styleUrls: ['./info.component.scss']
})
export class InfoComponent {
}
