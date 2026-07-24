# Tideman's Ranked Pair Voting Algorithm


### Winning Votes vs. Margin - Wann sich das auf das Endergebnis auswirkt

Eine unterschiedliche Sortierreihenfolge der Duelle bedeutet aber nicht automatisch einen anderen Sieger. Damit am Ende wirklich ein anderes Ergebnis herauskommt, muss die abweichende Sortierung dazu führen, dass der Algorithmus unterschiedliche Duelle sperrt.

Szenario ohne Zyklus: Alle Duelle können konfliktfrei in den Graphen übernommen werden, egal in welcher Reihenfolge sie betrachtet werden. Beide Algorithmen wählen denselben Sieger.

Szenario mit Zyklus: Kandidat A schlägt B, B schlägt C, aber C schlägt A. Jetzt muss der Algorithmus das schwächste Duell in diesem Zyklus ignorieren, um einen Widerspruch zu vermeiden. Da Winning Votes und Margin Votes die Stärke der Duelle nun unterschiedlich bewerten (aufgrund der Enthaltungen), wird unter Umständen ein anderes Duell aus dem Zyklus gestrichen.

In deiner App werden sich die beiden Methoden bei 20 Wählern und 4 Kandidaten also genau dann unterscheiden, wenn die Präferenzen der Nutzer so stark durchmischt sind, dass sich Schere-Stein-Papier-artige Zyklen bilden und gleichzeitig viele Enthaltungen bei den ungeliebten Alternativen vorliegen.





TODO

 - Schere-Stein-Papier-artige Zyklen in die Docu mit aufnehmen!! Der Begriff ist genail um A>B>C>A Zyklen zu erklären