import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../shared/auth/AuthContext'

// ── Types ─────────────────────────────────────────────────────
type Lang = 'en' | 'fr' | 'nl'

interface ObData {
  lang:          Lang
  firstName:     string
  lastName:      string
  phone:         string
  role:          string
  buildingCount: string
  // Building
  bName:         string
  bAddress:      string
  bPostal:       string
  bCity:         string
  bCountry:      string
  bYear:         string
  bFloors:       string
  bUnits:        string
  // VME & legal
  hasVme:        string
  vmeNumber:     string
  hasActe:       string
  hasRME:        string
  hasMandate:    string
  // Financials
  hasBankAccount: string
  bankIban:       string
  bankName:       string
  // Insurance
  hasInsurance:   string
  insurer:        string
  policyNo:       string
  insRenewal:     string
  // Co-owners
  ownerInfo:      string
  wantsPortal:    string
  // Compliance
  compliance:     string[]
}

const EMPTY: ObData = {
  lang: 'fr', firstName: '', lastName: '', phone: '', role: '', buildingCount: '',
  bName: '', bAddress: '', bPostal: '', bCity: '', bCountry: '', bYear: '', bFloors: '', bUnits: '',
  hasVme: '', vmeNumber: '', hasActe: '', hasRME: '', hasMandate: '',
  hasBankAccount: '', bankIban: '', bankName: '',
  hasInsurance: '', insurer: '', policyNo: '', insRenewal: '',
  ownerInfo: '', wantsPortal: '',
  compliance: [],
}

const TOTAL_STEPS = 10

// ── Step labels ───────────────────────────────────────────────
const STEP_LABELS: Record<Lang, string[]> = {
  en: ['Language', 'Before you begin', 'About you', 'Your building', 'VME & legal', 'Financials', 'Insurance', 'Co-owners', 'Compliance', 'Ready!'],
  fr: ['Langue', 'Avant de commencer', 'À propos', 'Votre immeuble', 'ACP & légal', 'Finances', 'Assurances', 'Copropriétaires', 'Conformité', 'Prêt !'],
  nl: ['Taal', 'Voordat u begint', 'Over u', 'Uw gebouw', 'VME & juridisch', 'Financiën', 'Verzekeringen', 'Mede-eigenaars', 'Conformiteit', 'Klaar!'],
}

// ── Translations ──────────────────────────────────────────────
const T = {
  en: {
    langTitle: 'Welcome to SyndicSage',
    langSub: 'Choose your preferred language to get started.',
    // Step 2 — Before you begin
    prepTitle: 'Before you begin',
    prepIntro: 'To get started, you only need two documents:',
    prepDoc1: 'Basic deed (acte de base)',
    prepDoc2: 'Joint ownership regulations (règlement de copropriété)',
    prepNotary: 'These documents are sometimes bundled together in one notarial deed. Upon the purchase of your apartment, you should have received a copy from your notary.',
    prepReassure: "Don't have them yet? No worries — we'll help you track them down once setup is complete.",
    // Step 3 — About you
    s3t: 'About you', s3sub: "Let's start with who you are. This personalises your workspace.",
    firstname: 'First name', lastname: 'Last name', phoneLabel: 'Phone number',
    roleLabel: 'I am…',
    r1: 'A voluntary syndic', r1s: 'Self-managed VME',
    r2: 'A professional syndic', r2s: 'Managing buildings for clients',
    bcountLabel: 'How many buildings do you manage?',
    bc1: '1', bc1s: 'Just one', bc2: '2–5', bc2s: 'Small portfolio', bc3: '6–15', bc3s: 'Growing', bc4: '16+', bc4s: 'Large portfolio',
    // Step 4 — Building
    s4t: 'Your first building', s4sub: 'Register the building you manage. You can add more afterwards.',
    bname: 'Building name (VME name) *', bnameHint: 'Use the name of the VME as written on the basic deed.',
    baddr: 'Street address', bpostal: 'Postal code', bcity: 'City', bcountry: 'Country',
    byear: 'Year built', bfloors: 'Floors', bunits: 'Units / lots *',
    // Step 5 — VME & legal
    s5t: 'VME & legal', s5sub: 'These details pre-fill your convocation letters and official filings.',
    vmeQ: 'Does your building have a VME number (BCE / KBO)?',
    vmeYes: 'Yes — I have it', vmeNo: 'Not yet', vmeUnknown: "Don't know / need to check",
    vmeHint: 'You can look it up for free at syndi.be',
    vmeNoNote: "Don't worry — we'll help you with your application for a VME number.",
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Basic deed',
    a1: 'Have it', a1s: 'Ready to upload', a1note: "Great — we'll show you where to upload the Basic Deed after setup.",
    a2: 'Upload later', a2s: 'Need to locate it',
    a3: "Don't have it — where can I find it?", a3s: 'Not yet obtained',
    a3note: 'We will help you retrieve your Basic Deed once we complete the setup.',
    rmeLabel: 'Joint ownership regulations',
    rme1: 'Have it', rme1s: 'Ready to upload', rme1note: "Great — we'll show you where to upload it after setup.",
    rme2: 'Upload later', rme2s: 'Need to locate it',
    rme3: "Don't have it — where can I find it?", rme3s: 'Not yet obtained',
    rme3note: 'We will help you retrieve your Joint Ownership Regulations once we complete the setup.',
    mandateQ: 'Do you have a syndic mandate?',
    mandateYes: 'Yes — I have the PV of the first AG',
    mandateYesNote: "Great — once your syndic mandate is confirmed, it will be stored on your profile.",
    mandateNo: 'Not yet — I need to obtain it',
    mandateNoNote: 'We will help you obtain a syndic mandate through your first general assembly once we complete the setup.',
    // Step 6 — Financials
    s6t: 'Financials', s6sub: 'These figures feed your dashboard and AG report templates.',
    bankQ: 'Does your VME have a bank account?',
    bankYes: 'Yes', bankUnsure: 'Not sure / need to check', bankNo: 'Not yet opened',
    bankNoNote: 'We will help you create a bank account for your VME once we complete the setup.',
    bankIban: 'VME bank account IBAN', bankName: 'Bank name',
    bankTip: 'Belgian law requires a VME to have a bank account in its own name. Options: BNP Paribas Fortis (~€10/quarter), Argenta (free for VMEs).',
    // Step 7 — Insurance
    s7t: 'Insurance', s7sub: "Let's capture your VME's insurance details.",
    insQ: 'Does the VME have fire insurance?',
    insYes: 'Yes — active policy', insNo: 'Not yet / not sure',
    insYesNote: "Great — we'll show you where to upload the insurance policy as soon as we finish setup.",
    insurer: 'Insurance company', policyNo: 'Policy number', insRenewal: 'Renewal date',
    insTip: 'Liability insurance is legally required for syndics (Art. 577-9 Belgian Civil Code). Fire insurance is strongly recommended.',
    // Step 8 — Co-owners
    s8t: 'Co-owners', s8sub: 'This helps us set up the portal and payment tracking.',
    ownerInfoLabel: 'How complete is your co-owner contact list?',
    oi1: 'Complete', oi1s: 'Names, emails & units ready',
    oi2: 'Partial', oi2s: 'Some info missing',
    oi3: 'Not yet', oi3s: "I'll add them manually",
    portalQ: 'Activate the co-owner portal?',
    p1: 'Yes, immediately', p1s: 'Owners can log in right away',
    p2: 'Later', p2s: "I'll set it up when ready",
    // Step 9 — Compliance
    s9t: 'Compliance checklist', s9sub: 'Select which certificates and inspections you currently have on file.',
    c1: 'Electrical inspection (RGIE)', c1s: 'Required every 25 years',
    c2: 'Elevator inspection', c2s: 'Annual mandatory inspection',
    c3: 'Fire safety inspection', c3s: 'Smoke detectors, extinguishers, exits',
    c4: 'Asbestos inventory', c4s: 'Required for buildings pre-2001',
    c5: 'Gas / heating inspection', c5s: 'Boiler & gas installation certificate',
    c6: 'Energy Performance Certificate (EPC)', c6s: 'For common areas',
    c7: 'None on file', c7s: "I'll add them as I collect them",
    // Step 10 — Ready
    s10t: 'Your workspace is ready', s10sub: "Here's what we'll create — and what to tackle next.",
    creatingNow: 'Creating now', doNext: 'To do next',
    finishBtn: 'Launch my workspace →',
    creating: 'Setting up your workspace…',
    // Nav
    next: 'Next →', back: '← Back', skip: 'Skip for now',
  },
  fr: {
    langTitle: 'Bienvenue sur SyndicSage',
    langSub: 'Choisissez votre langue préférée pour commencer.',
    prepTitle: 'Avant de commencer',
    prepIntro: 'Pour démarrer, il vous suffit de deux documents :',
    prepDoc1: 'Acte de base',
    prepDoc2: 'Règlement de copropriété',
    prepNotary: "Ces documents sont parfois regroupés dans un seul acte notarié. Lors de l'achat de votre appartement, vous avez dû en recevoir une copie de votre notaire.",
    prepReassure: "Vous ne les avez pas encore ? Pas de panique — nous vous aiderons à les retrouver une fois la configuration terminée.",
    s3t: 'À propos de vous', s3sub: "Commençons par votre profil. Cela personnalise votre espace.",
    firstname: 'Prénom', lastname: 'Nom de famille', phoneLabel: 'Téléphone',
    roleLabel: 'Je suis…',
    r1: 'Un syndic bénévole', r1s: 'VME autogérée',
    r2: 'Un syndic professionnel', r2s: 'Gérant des immeubles pour des clients',
    bcountLabel: "Combien d'immeubles gérez-vous ?",
    bc1: '1', bc1s: 'Un seul', bc2: '2–5', bc2s: 'Petit portefeuille', bc3: '6–15', bc3s: 'En croissance', bc4: '16+', bc4s: 'Grand portefeuille',
    s4t: 'Votre premier immeuble', s4sub: "Enregistrez l'immeuble que vous gérez. Vous pourrez en ajouter d'autres ensuite.",
    bname: "Nom de l'immeuble (nom de l'ACP) *", bnameHint: "Utilisez le nom de l'ACP tel qu'il apparaît sur l'acte de base.",
    baddr: 'Adresse', bpostal: 'Code postal', bcity: 'Ville', bcountry: 'Pays',
    byear: 'Année de construction', bfloors: 'Étages', bunits: 'Nombre de lots *',
    s5t: 'ACP & légal', s5sub: 'Ces données pré-remplissent vos convocations et dépôts officiels.',
    vmeQ: "Votre immeuble a-t-il un numéro d'ACP (BCE / KBO) ?",
    vmeYes: "Oui — je l'ai", vmeNo: 'Pas encore', vmeUnknown: "Je ne sais pas / je dois vérifier",
    vmeHint: 'Vous pouvez le rechercher gratuitement sur syndi.be',
    vmeNoNote: "Ne vous inquiétez pas — nous vous aiderons à obtenir un numéro d'ACP.",
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Acte de base',
    a1: "Je l'ai", a1s: 'Prêt à téléverser', a1note: "Parfait — nous vous montrerons où téléverser l'acte de base après la configuration.",
    a2: 'Téléverserai plus tard', a2s: 'Besoin de le retrouver',
    a3: "Je ne l'ai pas — où puis-je le trouver ?", a3s: 'Pas encore obtenu',
    a3note: 'Nous vous aiderons à récupérer votre acte de base une fois la configuration terminée.',
    rmeLabel: 'Règlement de copropriété',
    rme1: "Je l'ai", rme1s: 'Prêt à téléverser', rme1note: 'Parfait — nous vous montrerons où le téléverser après la configuration.',
    rme2: 'Téléverserai plus tard', rme2s: 'Besoin de le retrouver',
    rme3: "Je ne l'ai pas — où puis-je le trouver ?", rme3s: 'Pas encore obtenu',
    rme3note: 'Nous vous aiderons à récupérer votre règlement de copropriété une fois la configuration terminée.',
    mandateQ: 'Avez-vous un mandat de syndic ?',
    mandateYes: "Oui — j'ai le PV de la première AG",
    mandateYesNote: "Parfait — une fois confirmé, votre mandat sera enregistré dans votre profil.",
    mandateNo: "Pas encore — je dois l'obtenir",
    mandateNoNote: "Nous vous aiderons à obtenir un mandat de syndic lors de votre première assemblée générale, une fois la configuration terminée.",
    s6t: 'Finances', s6sub: "Ces chiffres alimentent votre tableau de bord et vos rapports d'AG.",
    bankQ: 'La VME dispose-t-elle d\'un compte bancaire ?',
    bankYes: 'Oui', bankUnsure: 'Pas sûr / je dois vérifier', bankNo: 'Non — pas encore ouvert',
    bankNoNote: 'Nous vous aiderons à ouvrir un compte bancaire pour votre VME une fois la configuration terminée.',
    bankIban: 'IBAN du compte bancaire VME', bankName: 'Nom de la banque',
    bankTip: 'La loi belge oblige toute VME à avoir un compte en son propre nom. Options : BNP Paribas Fortis (~10 €/trimestre), Argenta (gratuit pour les VME).',
    s7t: 'Assurances', s7sub: "Renseignons les détails d'assurance de votre VME.",
    insQ: 'La VME a-t-elle une assurance incendie ?',
    insYes: 'Oui — police active', insNo: 'Pas encore / incertain',
    insYesNote: "Parfait — nous vous montrerons où téléverser la police d'assurance dès la fin de la configuration.",
    insurer: "Compagnie d'assurance", policyNo: 'Numéro de police', insRenewal: 'Date de renouvellement',
    insTip: "L'assurance RC est légalement obligatoire pour le syndic (art. 577-9 Code civil belge). L'assurance incendie est vivement recommandée.",
    s8t: 'Copropriétaires', s8sub: 'Cela nous aide à configurer le portail et le suivi des paiements.',
    ownerInfoLabel: 'La liste de contacts des copropriétaires est…',
    oi1: 'Complète', oi1s: 'Noms, emails & lots prêts',
    oi2: 'Partielle', oi2s: 'Certaines infos manquantes',
    oi3: 'Pas encore', oi3s: "J'ajouterai manuellement",
    portalQ: 'Activer le portail copropriétaires ?',
    p1: 'Oui, maintenant', p1s: 'Les copropriétaires peuvent se connecter',
    p2: 'Plus tard', p2s: "Je le configurerai quand prêt",
    s9t: 'Checklist de conformité', s9sub: 'Sélectionnez les certificats que vous avez en dossier.',
    c1: 'Inspection électrique (RGIE)', c1s: 'Requise tous les 25 ans',
    c2: 'Inspection ascenseur', c2s: 'Inspection annuelle obligatoire',
    c3: 'Inspection sécurité incendie', c3s: 'Détecteurs, extincteurs, sorties',
    c4: 'Inventaire amiante', c4s: "Obligatoire pour les bâtiments avant 2001",
    c5: 'Inspection gaz / chauffage', c5s: 'Certificat chaudière & installation gaz',
    c6: 'Certificat PEB (zones communes)', c6s: 'Performance énergétique',
    c7: 'Aucun en dossier', c7s: "J'ajouterai au fur et à mesure",
    s10t: 'Votre espace est prêt', s10sub: "Voici ce que nous allons créer — et ce qu'il reste à faire.",
    creatingNow: 'En cours de création', doNext: 'À faire ensuite',
    finishBtn: 'Lancer mon espace →',
    creating: 'Configuration en cours…',
    next: 'Suivant →', back: '← Retour', skip: "Passer pour l'instant",
  },
  nl: {
    langTitle: 'Welkom bij SyndicSage',
    langSub: 'Kies uw voorkeurstaal om te beginnen.',
    prepTitle: 'Voordat u begint',
    prepIntro: 'Om te starten hebt u slechts twee documenten nodig:',
    prepDoc1: 'Basisakte',
    prepDoc2: 'Reglement van mede-eigendom',
    prepNotary: 'Deze documenten zijn soms gebundeld in één notariële akte. Bij de aankoop van uw appartement heeft u normaal gezien een kopie ontvangen van uw notaris.',
    prepReassure: 'Heeft u ze nog niet? Geen zorgen — we helpen u ze te vinden zodra de setup voltooid is.',
    s3t: 'Over u', s3sub: 'Laten we beginnen met wie u bent. Dit personaliseert uw werkruimte.',
    firstname: 'Voornaam', lastname: 'Achternaam', phoneLabel: 'Telefoonnummer',
    roleLabel: 'Ik ben…',
    r1: 'Een vrijwillige syndicus', r1s: 'Zelfbeherende VME',
    r2: 'Een professionele syndicus', r2s: 'Gebouwen beheren voor klanten',
    bcountLabel: 'Hoeveel gebouwen beheert u?',
    bc1: '1', bc1s: 'Slechts één', bc2: '2–5', bc2s: 'Klein portefeuille', bc3: '6–15', bc3s: 'Groeiend', bc4: '16+', bc4s: 'Groot portefeuille',
    s4t: 'Uw eerste gebouw', s4sub: 'Registreer het gebouw dat u beheert. U kunt er later meer toevoegen.',
    bname: 'Naam gebouw (VME-naam) *', bnameHint: 'Gebruik de naam van de VME zoals vermeld op de basisakte.',
    baddr: 'Adres', bpostal: 'Postcode', bcity: 'Stad', bcountry: 'Land',
    byear: 'Bouwjaar', bfloors: 'Verdiepingen', bunits: 'Aantal kavels *',
    s5t: 'VME & juridisch', s5sub: 'Deze gegevens vullen uw oproepingsbrieven vooraf in.',
    vmeQ: 'Heeft uw gebouw een VME-nummer (BCE / KBO)?',
    vmeYes: 'Ja — en ik heb het', vmeNo: 'Nog niet', vmeUnknown: 'Ik weet het niet / moet nakijken',
    vmeHint: 'U kunt het gratis opzoeken op syndi.be',
    vmeNoNote: 'Geen zorgen — we helpen u met uw aanvraag voor een VME-nummer.',
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Basisakte',
    a1: 'Ik heb het', a1s: 'Klaar om te uploaden', a1note: 'Goed — we tonen u waar u de basisakte kunt uploaden na de setup.',
    a2: 'Upload later', a2s: 'Moet het zoeken',
    a3: 'Ik heb het niet — waar vind ik het?', a3s: 'Nog niet verkregen',
    a3note: 'Wij helpen u uw basisakte te vinden zodra de setup voltooid is.',
    rmeLabel: 'Reglement van mede-eigendom',
    rme1: 'Ik heb het', rme1s: 'Klaar om te uploaden', rme1note: 'Goed — we tonen u waar u het reglement kunt uploaden na de setup.',
    rme2: 'Upload later', rme2s: 'Moet het zoeken',
    rme3: 'Ik heb het niet — waar vind ik het?', rme3s: 'Nog niet verkregen',
    rme3note: 'Wij helpen u uw reglement van mede-eigendom te vinden zodra de setup voltooid is.',
    mandateQ: 'Heeft u een syndicusmandaat?',
    mandateYes: 'Ja — ik heb het PV van de eerste AV',
    mandateYesNote: 'Uitstekend — uw syndicusmandaat wordt opgeslagen in uw profiel zodra het bevestigd is.',
    mandateNo: 'Nog niet — ik moet het nog verkrijgen',
    mandateNoNote: 'Wij helpen u een syndicusmandaat te verkrijgen via uw eerste algemene vergadering, zodra de setup voltooid is.',
    s6t: 'Financiën', s6sub: 'Deze cijfers voeden uw dashboard en AV-rapportsjablonen.',
    bankQ: 'Heeft de VME een bankrekening?',
    bankYes: 'Ja', bankUnsure: 'Niet zeker / moet nakijken', bankNo: 'Nee — nog niet geopend',
    bankNoNote: 'Wij helpen u een bankrekening aan te maken voor uw VME zodra de setup voltooid is.',
    bankIban: 'IBAN VME-bankrekening', bankName: 'Naam bank',
    bankTip: "Belgische wet verplicht elke VME een bankrekening op eigen naam. Opties: BNP Paribas Fortis (~€10/kwartaal), Argenta (gratis voor VME's).",
    s7t: 'Verzekeringen', s7sub: 'Laten we de verzekeringsgegevens van uw VME vastleggen.',
    insQ: 'Heeft de VME een brandverzekering?',
    insYes: 'Ja — actieve polis', insNo: 'Nog niet / onzeker',
    insYesNote: 'Uitstekend — we tonen u waar u de verzekeringspolis kunt uploaden zodra de setup voltooid is.',
    insurer: 'Verzekeringsmaatschappij', policyNo: 'Polisnummer', insRenewal: 'Verlengingsdatum',
    insTip: 'Aansprakelijkheidsverzekering is wettelijk verplicht voor de syndicus (art. 577-9 BW). Brandverzekering is sterk aanbevolen.',
    s8t: 'Mede-eigenaars', s8sub: 'Dit helpt ons het portaal en betalingsbeheer in te stellen.',
    ownerInfoLabel: 'Hoe volledig is uw contactlijst?',
    oi1: 'Volledig', oi1s: 'Namen, e-mails & kavels klaar',
    oi2: 'Gedeeltelijk', oi2s: 'Sommige info ontbreekt',
    oi3: 'Nog niet', oi3s: 'Voeg handmatig toe',
    portalQ: 'Mede-eigenaarportaal activeren?',
    p1: 'Ja, onmiddellijk', p1s: 'Eigenaars kunnen direct inloggen',
    p2: 'Later', p2s: 'Ik stel het in wanneer klaar',
    s9t: 'Conformiteitslijst', s9sub: 'Selecteer welke keuringen en certificaten u in dossier heeft.',
    c1: 'Elektrische keuring (AREI)', c1s: 'Vereist om de 25 jaar',
    c2: 'Liftkeuring', c2s: 'Jaarlijkse verplichte keuring',
    c3: 'Brandbeveiligingskeuring', c3s: 'Rookmelders, blusapparaten, vluchtwegen',
    c4: 'Asbestinventaris', c4s: 'Verplicht voor gebouwen van vóór 2001',
    c5: 'Gas / verwarmingskeuring', c5s: 'Ketel & gasinstallatie certificaat',
    c6: 'Energieprestatiecertificaat (EPC)', c6s: 'Voor gemeenschappelijke delen',
    c7: 'Niets in dossier', c7s: 'Ik voeg toe naarmate ik verzamel',
    s10t: 'Uw werkruimte is klaar', s10sub: 'Dit is wat we aanmaken — en wat u daarna kunt aanpakken.',
    creatingNow: 'Nu aanmaken', doNext: 'Vervolgens te doen',
    finishBtn: 'Mijn werkruimte starten →',
    creating: 'Werkruimte instellen…',
    next: 'Volgende →', back: '← Terug', skip: 'Nu overslaan',
  },
}

// ── Shared style helpers ──────────────────────────────────────
const css = {
  card: (selected: boolean): React.CSSProperties => ({
    border:       `1.5px solid ${selected ? '#1E3A5F' : 'rgba(60,60,67,0.14)'}`,
    borderRadius: 8,
    padding:      '10px 14px',
    cursor:       'pointer',
    background:   selected ? 'rgba(30,58,95,0.06)' : '#fff',
    transition:   'all 0.15s',
  }),
  checkCard: (selected: boolean): React.CSSProperties => ({
    border:       `1.5px solid ${selected ? '#1E3A5F' : 'rgba(60,60,67,0.14)'}`,
    borderRadius: 8,
    padding:      '10px 14px',
    cursor:       'pointer',
    background:   selected ? 'rgba(30,58,95,0.06)' : '#fff',
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    marginBottom: 6,
    transition:   'all 0.15s',
  }),
  label: {
    display:       'block' as const,
    fontSize:      11,
    fontWeight:    700,
    color:         '#1E3A5F',
    marginBottom:  6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  input: {
    width:        '100%',
    border:       '1.5px solid rgba(60,60,67,0.18)',
    borderRadius: 6,
    padding:      '8px 12px',
    fontSize:     13,
    color:        '#1E3A5F',
    background:   '#fff',
    outline:      'none',
    boxSizing:    'border-box' as const,
  },
  title: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize:   24,
    fontWeight: 700,
    color:      '#1E3A5F',
    margin:     '0 0 6px',
  },
  sub: {
    color:      '#6E6E73',
    fontSize:   13,
    lineHeight: 1.55,
    margin:     '0 0 20px',
  },
  grid2: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 10,
  } as React.CSSProperties,
  grid3: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap:                 10,
  } as React.CSSProperties,
  tip: {
    fontSize:   12,
    color:      '#1E3A5F',
    background: 'rgba(30,58,95,0.05)',
    border:     '1px solid rgba(30,58,95,0.12)',
    borderRadius: 8,
    padding:    '10px 12px',
    lineHeight: 1.6,
    marginTop:  8,
  } as React.CSSProperties,
  successNote: {
    fontSize:   12,
    color:      '#166534',
    background: 'rgba(22,101,52,0.07)',
    border:     '1px solid rgba(22,101,52,0.2)',
    borderRadius: 8,
    padding:    '10px 12px',
    marginTop:  8,
  } as React.CSSProperties,
  infoNote: {
    fontSize:   12,
    color:      '#92400E',
    background: 'rgba(245,158,11,0.07)',
    border:     '1px solid rgba(245,158,11,0.25)',
    borderRadius: 8,
    padding:    '10px 12px',
    marginTop:  8,
  } as React.CSSProperties,
  hint: {
    fontSize:   11,
    color:      '#6E6E73',
    marginTop:  4,
    lineHeight: 1.5,
  } as React.CSSProperties,
}

// ── Main component ────────────────────────────────────────────
export default function OnboardingPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [ob, setOb]           = useState<ObData>(EMPTY)

  const v = T[ob.lang] ?? T.en
  const labels = STEP_LABELS[ob.lang] ?? STEP_LABELS.en

  function set<K extends keyof ObData>(key: K, val: ObData[K]) {
    setOb(prev => ({ ...prev, [key]: val }))
  }

  function toggleArr(key: 'compliance', val: string) {
    setOb(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })
  }

  function canNext(): boolean {
    if (step === 4) {
      const nameOk  = ob.bName.trim().length > 0 && ob.bName.trim().length <= 100
      const cityOk  = ob.bCity.trim().length > 0 && ob.bCity.trim().length <= 100
      const unitsOk = !!ob.bUnits.trim()
      return nameOk && cityOk && unitsOk
    }
    if (step === 6 && ob.hasBankAccount === 'yes' && ob.bankIban.trim()) {
      const iban = ob.bankIban.replace(/\s/g, '').toUpperCase()
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban)
    }
    return true
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setError('')

    try {
      // 1. Organization
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name: `${ob.firstName} ${ob.lastName}`.trim() || user.email })
        .select('id').single()
      if (orgErr || !org) throw new Error(orgErr?.message)

      // 2. Profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id:              user.id,
        organization_id: org.id,
        full_name:       (`${ob.firstName} ${ob.lastName}`.trim() || user.email) ?? '',
        email:           user.email ?? '',
      })
      if (profileErr) throw new Error(profileErr.message)

      // 3. Building
      const addressLine = [ob.bAddress.trim(), ob.bPostal.trim()].filter(Boolean).join(', ')
      const { data: building, error: buildingErr } = await supabase
        .from('buildings')
        .insert({
          organization_id: org.id,
          name:            ob.bName.trim(),
          address:         addressLine || 'TBD',
          city:            ob.bCity.trim(),
          unit_count:      (() => { const n = parseInt(ob.bUnits, 10); return isNaN(n) ? 1 : n })(),
        })
        .select('id').single()
      if (buildingErr || !building) throw new Error(buildingErr?.message)

      // 4. Member
      const { error: memberErr } = await supabase.from('building_members').insert({
        building_id: building.id,
        user_id:     user.id,
        role:        'syndic',
      })
      if (memberErr) throw new Error(memberErr.message)

      // 5. Store onboarding metadata in auth user_metadata
      await supabase.auth.updateUser({
        data: {
          ob_lang:           ob.lang,
          ob_role:           ob.role,
          ob_building_count: ob.buildingCount,
          ob_has_acte:       ob.hasActe,
          ob_has_rme:        ob.hasRME,
          ob_wants_portal:   ob.wantsPortal,
          onboarding_complete: true,
        },
      })

      navigate('/subscribe', { replace: true })
    } catch (err) {
      console.error('[onboarding] handleFinish failed:', err)
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 14, border: '1px solid rgba(60,60,67,0.10)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', display: 'flex', overflow: 'hidden', minHeight: 560 }}>

        {/* ── LEFT PANEL ──────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0, background: '#F0F0F5', borderRight: '1px solid rgba(60,60,67,0.08)', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
          {/* Logo */}
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#1E3A5F' }}>
              Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
            </span>
          </div>

          {/* Steps */}
          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
            {labels.map((label, i) => {
              const n = i + 1
              const done   = n < step
              const active = n === step
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 6, marginBottom: 2, background: active ? 'rgba(30,58,95,0.08)' : 'transparent' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: done ? '#1E3A5F' : active ? '#1E3A5F' : 'rgba(60,60,67,0.12)',
                    color: done || active ? '#fff' : '#6E6E73',
                  }}>
                    {done ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1E3A5F' : done ? '#1E3A5F' : '#6E6E73' }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </nav>

          {/* Progress */}
          <div style={{ padding: '16px 20px 0', borderTop: '1px solid rgba(60,60,67,0.08)' }}>
            <div style={{ height: 4, background: 'rgba(60,60,67,0.10)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1E3A5F', borderRadius: 2, width: `${Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)}%`, transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ fontSize: 11, color: '#6E6E73', margin: 0 }}>🔒 Your data is encrypted</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px 16px' }}>

            {error && <div style={{ color: '#DC2626', fontSize: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}

            {/* STEP 1 — Language */}
            {step === 1 && (
              <div>
                <h2 style={css.title}>
                  {v.langTitle.replace('SyndicSage', '')}Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
                </h2>
                <p style={css.sub}>{v.langSub}</p>
                <div style={css.grid3}>
                  {(['en', 'fr', 'nl'] as Lang[]).map(lang => (
                    <div key={lang} onClick={() => set('lang', lang)} style={{ ...css.card(ob.lang === lang), textAlign: 'center', padding: '16px 12px' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{lang === 'en' ? '🇬🇧' : '🇧🇪'}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{lang === 'en' ? 'English' : lang === 'fr' ? 'Français' : 'Nederlands'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2 — Before you begin */}
            {step === 2 && (
              <div>
                <h2 style={css.title}>{v.prepTitle}</h2>
                <p style={css.sub}>{v.prepIntro}</p>
                <div style={{ marginBottom: 16 }}>
                  {[v.prepDoc1, v.prepDoc2].map(doc => (
                    <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(30,58,95,0.04)', border: '1px solid rgba(30,58,95,0.10)', borderRadius: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{doc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...css.tip, marginTop: 0 }}>
                  {v.prepNotary}
                </div>
                <p style={{ fontSize: 12, color: '#6E6E73', marginTop: 12, lineHeight: 1.6 }}>{v.prepReassure}</p>
              </div>
            )}

            {/* STEP 3 — About you */}
            {step === 3 && (
              <div>
                <h2 style={css.title}>{v.s3t}</h2>
                <p style={css.sub}>{v.s3sub}</p>
                <div style={{ ...css.grid2, marginBottom: 12 }}>
                  <Field label={v.firstname}><input style={css.input} value={ob.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jean" autoFocus /></Field>
                  <Field label={v.lastname}><input style={css.input} value={ob.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dupont" /></Field>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <Field label={v.phoneLabel}><input style={css.input} value={ob.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 470 00 00 00" type="tel" /></Field>
                </div>
                <Field label={v.roleLabel}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['non_professional', v.r1, v.r1s], ['professional', v.r2, v.r2s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('role', val)} style={css.card(ob.role === val)}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </Field>
                {ob.role === 'professional' && (
                  <Field label={v.bcountLabel} style={{ marginTop: 14 }}>
                    <div style={{ ...css.grid2, marginTop: 6 }}>
                      {([['1', v.bc1, v.bc1s], ['2-5', v.bc2, v.bc2s], ['6-15', v.bc3, v.bc3s], ['16plus', v.bc4, v.bc4s]] as [string, string, string][]).map(([val, title, sub]) => (
                        <div key={val} onClick={() => set('buildingCount', val)} style={css.card(ob.buildingCount === val)}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                          <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            )}

            {/* STEP 4 — First building */}
            {step === 4 && (
              <div>
                <h2 style={css.title}>{v.s4t}</h2>
                <p style={css.sub}>{v.s4sub}</p>
                <Field label={v.bname} style={{ marginBottom: 12 }}>
                  <input style={css.input} value={ob.bName} onChange={e => set('bName', e.target.value)} placeholder="Résidence du Parc" autoFocus />
                  <p style={css.hint}>{v.bnameHint}</p>
                </Field>
                <Field label={v.baddr} style={{ marginBottom: 12 }}>
                  <input style={css.input} value={ob.bAddress} onChange={e => set('bAddress', e.target.value)} placeholder="Rue de la Loi 1" />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Field label={v.bpostal}><input style={css.input} value={ob.bPostal} onChange={e => set('bPostal', e.target.value)} placeholder="1000" /></Field>
                  <Field label={v.bcity}><input style={css.input} value={ob.bCity} onChange={e => set('bCity', e.target.value)} placeholder="Bruxelles" /></Field>
                  <Field label={v.bcountry}><input style={css.input} value={ob.bCountry} onChange={e => set('bCountry', e.target.value)} placeholder="Belgium" /></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label={v.byear}><input style={css.input} value={ob.bYear} onChange={e => set('bYear', e.target.value)} placeholder="1985" type="number" /></Field>
                  <Field label={v.bfloors}><input style={css.input} value={ob.bFloors} onChange={e => set('bFloors', e.target.value)} placeholder="6" type="number" /></Field>
                  <Field label={v.bunits}><input style={css.input} value={ob.bUnits} onChange={e => set('bUnits', e.target.value)} placeholder="24" type="number" /></Field>
                </div>
              </div>
            )}

            {/* STEP 5 — VME & legal */}
            {step === 5 && (
              <div>
                <h2 style={css.title}>{v.s5t}</h2>
                <p style={css.sub}>{v.s5sub}</p>
                <Field label={v.vmeQ} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.vmeYes], ['no', v.vmeNo], ['unknown', v.vmeUnknown]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasVme', val)} style={css.card(ob.hasVme === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {ob.hasVme === 'yes' && <input style={{ ...css.input, marginTop: 8 }} value={ob.vmeNumber} onChange={e => set('vmeNumber', e.target.value)} placeholder={v.vmePH} />}
                  {ob.hasVme === 'unknown' && <div style={css.tip}>{v.vmeHint} — <a href="https://syndi.be" target="_blank" rel="noopener" style={{ color: '#1E3A5F', fontWeight: 600 }}>syndi.be</a></div>}
                  {ob.hasVme === 'no' && <div style={css.infoNote}>{v.vmeNoNote}</div>}
                </Field>
                <Field label={v.acteLabel} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.a1, v.a1s], ['upload_later', v.a2, v.a2s], ['no', v.a3, v.a3s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('hasActe', val)} style={css.card(ob.hasActe === val)}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {ob.hasActe === 'yes' && <div style={css.successNote}>{v.a1note}</div>}
                  {ob.hasActe === 'no' && <div style={css.infoNote}>{v.a3note}</div>}
                </Field>
                <Field label={v.rmeLabel} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.rme1, v.rme1s], ['upload_later', v.rme2, v.rme2s], ['no', v.rme3, v.rme3s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('hasRME', val)} style={css.card(ob.hasRME === val)}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {ob.hasRME === 'yes' && <div style={css.successNote}>{v.rme1note}</div>}
                  {ob.hasRME === 'no' && <div style={css.infoNote}>{v.rme3note}</div>}
                </Field>
                <Field label={v.mandateQ}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['yes', v.mandateYes], ['no', v.mandateNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasMandate', val)} style={css.card(ob.hasMandate === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {ob.hasMandate === 'yes' && <div style={css.successNote}>{v.mandateYesNote}</div>}
                  {ob.hasMandate === 'no' && <div style={css.infoNote}>{v.mandateNoNote}</div>}
                </Field>
              </div>
            )}

            {/* STEP 6 — Financials */}
            {step === 6 && (
              <div>
                <h2 style={css.title}>{v.s6t}</h2>
                <p style={css.sub}>{v.s6sub}</p>
                <Field label={v.bankQ} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.bankYes], ['unsure', v.bankUnsure], ['no', v.bankNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasBankAccount', val)} style={css.card(ob.hasBankAccount === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {ob.hasBankAccount === 'no' && <div style={css.infoNote}>{v.bankNoNote}</div>}
                </Field>
                {ob.hasBankAccount === 'yes' && (
                  <>
                    <Field label={v.bankIban} style={{ marginBottom: 12 }}><input style={css.input} value={ob.bankIban} onChange={e => set('bankIban', e.target.value)} placeholder="BE68 5390 0754 7034" autoFocus /></Field>
                    <Field label={v.bankName}>
                      <select style={{ ...css.input, cursor: 'pointer' }} value={ob.bankName} onChange={e => set('bankName', e.target.value)}>
                        <option value="">— select —</option>
                        {['BNP Paribas Fortis','ING','KBC','Belfius','Argenta','Bpost Bank','AXA Bank','Other'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </>
                )}
                {ob.hasBankAccount === 'unsure' && <div style={css.tip}>{v.bankTip}</div>}
              </div>
            )}

            {/* STEP 7 — Insurance */}
            {step === 7 && (
              <div>
                <h2 style={css.title}>{v.s7t}</h2>
                <p style={css.sub}>{v.s7sub}</p>
                <Field label={v.insQ} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['yes', v.insYes], ['no', v.insNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasInsurance', val)} style={css.card(ob.hasInsurance === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {ob.hasInsurance === 'yes' && <div style={css.successNote}>{v.insYesNote}</div>}
                </Field>
                {ob.hasInsurance === 'yes' && (
                  <>
                    <Field label={v.insurer} style={{ marginBottom: 12 }}><input style={css.input} value={ob.insurer} onChange={e => set('insurer', e.target.value)} placeholder="Axa / Ethias / AG Insurance" autoFocus /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label={v.policyNo}><input style={css.input} value={ob.policyNo} onChange={e => set('policyNo', e.target.value)} placeholder="VME-2024-XXXXX" /></Field>
                      <Field label={v.insRenewal}><input style={css.input} value={ob.insRenewal} onChange={e => set('insRenewal', e.target.value)} type="date" /></Field>
                    </div>
                  </>
                )}
                <div style={css.tip}>{v.insTip}</div>
              </div>
            )}

            {/* STEP 8 — Co-owners */}
            {step === 8 && (
              <div>
                <h2 style={css.title}>{v.s8t}</h2>
                <p style={css.sub}>{v.s8sub}</p>
                <Field label={v.ownerInfoLabel} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.oi1, v.oi1s], ['partial', v.oi2, v.oi2s], ['no', v.oi3, v.oi3s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('ownerInfo', val)} style={css.card(ob.ownerInfo === val)}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label={v.portalQ}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['yes', v.p1, v.p1s], ['later', v.p2, v.p2s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('wantsPortal', val)} style={css.card(ob.wantsPortal === val)}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 9 — Compliance */}
            {step === 9 && (
              <div>
                <h2 style={css.title}>{v.s9t}</h2>
                <p style={css.sub}>{v.s9sub}</p>
                {([['electrical', v.c1, v.c1s], ['elevator', v.c2, v.c2s], ['fire', v.c3, v.c3s], ['asbestos', v.c4, v.c4s], ['gas', v.c5, v.c5s], ['epc', v.c6, v.c6s], ['none', v.c7, v.c7s]] as [string, string, string][]).map(([val, title, sub]) => (
                  <div key={val} onClick={() => toggleArr('compliance', val)} style={css.checkCard(ob.compliance.includes(val))}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${ob.compliance.includes(val) ? '#1E3A5F' : 'rgba(60,60,67,0.3)'}`, background: ob.compliance.includes(val) ? '#1E3A5F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ob.compliance.includes(val) && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                      <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 1 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 10 — Summary */}
            {step === 10 && (
              <div>
                <h2 style={css.title}>{v.s10t}</h2>
                <p style={css.sub}>{v.s10sub}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#F0F7FF', border: '1px solid rgba(30,58,95,0.12)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{v.creatingNow}</div>
                    {[`👤 ${ob.firstName || 'Your'} profile`, `🏢 ${ob.bName || 'Your building'}`, '🔑 Syndic access', '📊 Dashboard'].map(item => (
                      <div key={item} style={{ fontSize: 12, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ color: '#22C55E' }}>✓</span> {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{v.doNext}</div>
                    {[ob.hasActe !== 'yes' && '📄 Upload basic deed', ob.hasRME !== 'yes' && '📋 Upload joint ownership regulations', ob.hasBankAccount !== 'yes' && '🏦 Add VME bank account', '👥 Add co-owners'].filter(Boolean).slice(0, 4).map(item => (
                      <div key={String(item)} style={{ fontSize: 12, color: '#92400E', marginBottom: 6 }}>→ {item}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Footer nav ──────────────────────────────── */}
          <div style={{ padding: '16px 36px', borderTop: '1px solid rgba(60,60,67,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} disabled={saving} style={{ background: 'none', border: 'none', color: '#6E6E73', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}>
                  {v.back}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {step < TOTAL_STEPS && step > 2 && (
                <button onClick={() => setStep(s => s + 1)} style={{ background: 'none', border: 'none', color: '#6E6E73', fontSize: 12, cursor: 'pointer' }}>
                  {v.skip}
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed', opacity: canNext() ? 1 : 0.5 }}
                >
                  {v.next}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? v.creating : v.finishBtn}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={css.label}>{label}</label>
      {children}
    </div>
  )
}
