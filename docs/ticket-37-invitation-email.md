# Invitation par email

Le flux d'invitation Ridebook lie désormais chaque token à une adresse email précise.

- L'administrateur doit fournir une adresse email valide à la création de l'invitation.
- L'API enregistre cette adresse avec l'invitation et déclenche immédiatement l'envoi SMTP.
- Le mail utilise le template clair Ridebook et contient le bouton **Créer mon compte**.
- Le lien est valable une heure et utilisable une seule fois.
- La page `/invitations/accept` résout l'adresse liée au token et l'affiche en lecture seule ; seul le mot de passe est saisi.
- L'API ignore tout email fourni par un client lors de l'inscription : le compte est toujours créé avec l'adresse stockée sur l'invitation.
- Les anciennes invitations non liées à une adresse sont invalidées par la migration.
