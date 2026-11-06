# Certification Microsoft — étape à faire avec un compte Microsoft

Microsoft exige deux fichiers exportés depuis Power Apps (impossible à fabriquer à la main).
Durée : ~30 minutes. Compte gratuit : https://aka.ms/PowerAppsDevPlan (environnement développeur).

1. https://make.powerapps.com → Solutions → Nouvelle solution « AgentNexusConnector ».
2. Dans la solution : Nouveau → Automatisation → Connecteur personnalisé → Importer un fichier OpenAPI
   → choisir `apiDefinition.swagger.json`. Couleur d'icône : #da3b01. Enregistrer, créer une connexion avec une clé gratuite, tester « DiscoverCapabilities ».
3. Solution → Vérificateur de solution → Exécuter (0 erreur critique).
4. Exporter la solution (Non gérée) → fichier 1.
5. Nouvelle solution « AgentNexusFlow » : ajouter le connecteur existant + un flux instantané qui appelle « Find a service for a task » (q = send email). Tester le flux.
6. Exporter (Non gérée) → fichier 2.
7. Envoyer les deux fichiers dans le chat : l'assemblage, la validation et l'envoi sur la PR #4343 sont faits ensuite.
