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
  yearsExp:      string
  buildingCount: string
  // Building
  bName:         string
  bAddress:      string
  bCity:         string
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
  ownerCount:     string
  ownerInfo:      string
  wantsPortal:    string
  // Compliance
  compliance:     string[]
  // Workflow
  currentTool:    string
  painPoints:     string[]
  // Priorities
  priorities:     string[]
}

const EMPTY: ObData = {
  lang: 'fr', firstName: '', lastName: '', phone: '', role: '', yearsExp: '', buildingCount: '',
  bName: '', bAddress: '', bCity: '', bYear: '', bFloors: '', bUnits: '',
  hasVme: '', vmeNumber: '', hasActe: '', hasRME: '', hasMandate: '',
  hasBankAccount: '', bankIban: '', bankName: '',
  hasInsurance: '', insurer: '', policyNo: '', insRenewal: '',
  ownerCount: '', ownerInfo: '', wantsPortal: '',
  compliance: [], currentTool: '', painPoints: [], priorities: [],
}

const TOTAL_STEPS = 11

// ── Step labels ───────────────────────────────────────────────
const STEP_LABELS: Record<Lang, string[]> = {
  en: ['Language','About you','Your building','VME & legal','Financials','Insurance','Co-owners','Compliance','Your workflow','Priorities','Ready!'],
  fr: ['Langue','À propos','Votre immeuble','ACP & légal','Finances','Assurances','Copropriétaires','Conformité','Workflow actuel','Priorités','Prêt !'],
  nl: ['Taal','Over u','Uw gebouw','VME & juridisch','Financiën','Verzekeringen','Mede-eigenaars','Conformiteit','Huidige aanpak','Prioriteiten','Klaar!'],
}

// ── Translations ──────────────────────────────────────────────
const T = {
  en: {
    prepTitle: 'Before you begin',
    prep: 'This questionnaire takes approximately 30 minutes. Please have ready: VME number, insurance policy, co-owner list, financial figures, and compliance certificates.',
    prepReassure: "Don't have everything at hand? No worries — we'll guide you through each step.",
    langTitle: 'Welcome to SyndicSage',
    langSub: 'Choose your preferred language to get started.',
    // Step 2
    s2t: 'About you', s2sub: "Let's start with who you are. This personalises your workspace.",
    firstname: 'First name', lastname: 'Last name', emailLabel: 'Email address', phoneLabel: 'Phone number',
    yearsLabel: 'Years of experience as syndic',
    y1: '< 1 year', y2: '1–3 years', y3: '4–10 years', y4: '10+ years',
    roleLabel: 'I am a…',
    r1: 'Voluntary syndic', r1s: 'Self-managed VME',
    r2: 'Professional syndic', r2s: 'Managing buildings for clients',
    volNote: 'As a voluntary syndic, you may set up a compensation — a service fee approved by the general assembly.',
    bcountLabel: 'How many buildings do you manage?',
    bc1: '1', bc1s: 'Just one', bc2: '2–5', bc2s: 'Small portfolio', bc3: '6–15', bc3s: 'Growing', bc4: '16+', bc4s: 'Large portfolio',
    // Step 3
    s3t: 'Your first building', s3sub: 'Register the building you manage most. You can add more afterwards.',
    bname: 'Building name *', baddr: 'Street address', bcity: 'City', byear: 'Year built', bfloors: 'Floors', bunits: 'Units / lots *',
    // Step 4
    s4t: 'VME & legal', s4sub: 'These details pre-fill your convocation letters and official filings.',
    vmeQ: 'Does your building have a VME number (BCE / KBO)?',
    vmeYes: 'Yes — I have it', vmeNo: 'Not yet', vmeUnknown: "Don't know / need to check",
    vmeHint: 'You can look it up for free at syndi.be',
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Acte de base / statutes',
    a1: 'Have it', a1s: 'Ready to upload', a1note: "Great — we'll show you where to upload the acte de base after setup.",
    a2: 'Upload later', a2s: 'Need to locate it',
    a3: "Don't have it", a3s: 'Not yet obtained',
    rmeLabel: 'Règlement de copropriété / RME',
    rme1: 'Have it', rme1s: 'Ready to upload', rme1note: "Great — we'll show you where to upload it after setup.",
    rme2: 'Upload later', rme2s: 'Need to locate it',
    rme3: "Don't have it", rme3s: 'Not yet obtained',
    mandateQ: 'Do you have a syndic mandate?',
    mandateYes: 'Yes — I have the PV of the first AG',
    mandateNo: 'Not yet — I need to obtain it',
    // Step 5
    s5t: 'Financials', s5sub: 'These figures feed your dashboard and AG report templates.',
    bankQ: 'Does your VME have a bank account?',
    bankYes: 'Yes', bankUnsure: 'Not sure / need to check', bankNo: 'Not yet opened',
    bankIban: 'VME bank account IBAN', bankName: 'Bank name',
    bankTip: 'Belgian law requires a VME to have a bank account in its own name. Options: BNP Paribas Fortis (~€10/quarter), Argenta (free for VMEs).',
    // Step 6
    s6t: 'Insurance', s6sub: "Let's capture your VME's insurance details.",
    insQ: 'Does the VME have fire insurance?',
    insYes: 'Yes — active policy', insNo: 'Not yet / not sure',
    insurer: 'Insurance company', policyNo: 'Policy number', insRenewal: 'Renewal date',
    insTip: 'Liability insurance is legally required for syndics (Art. 577-9 Belgian Civil Code). Fire insurance is strongly recommended.',
    // Step 7
    s7t: 'Co-owners', s7sub: 'This helps us set up the portal and payment tracking.',
    ownerCount: 'Approximate number of co-owners',
    ownerInfoLabel: 'How complete is your co-owner contact list?',
    oi1: 'Complete', oi1s: 'Names, emails & units ready',
    oi2: 'Partial', oi2s: 'Some info missing',
    oi3: 'Not yet', oi3s: "I'll add them manually",
    portalQ: 'Activate the co-owner portal?',
    p1: 'Yes, immediately', p1s: 'Owners can log in right away',
    p2: 'Later', p2s: "I'll set it up when ready",
    // Step 8
    s8t: 'Compliance checklist', s8sub: 'Select which certificates and inspections you currently have on file.',
    c1: 'Electrical inspection (RGIE)', c1s: 'Required every 25 years',
    c2: 'Elevator inspection', c2s: 'Annual mandatory inspection',
    c3: 'Fire safety inspection', c3s: 'Smoke detectors, extinguishers, exits',
    c4: 'Asbestos inventory', c4s: 'Required for buildings pre-2001',
    c5: 'Gas / heating inspection', c5s: 'Boiler & gas installation certificate',
    c6: 'Energy Performance Certificate (EPC)', c6s: 'For common areas',
    c7: 'None on file', c7s: "I'll add them as I collect them",
    // Step 9
    s9t: 'Your current workflow', s9sub: 'Help us understand how you manage today.',
    toolLabel: 'How do you manage your buildings today?',
    t1: 'Excel / Google Sheets', t2: 'Paper & binders',
    t3: 'Generic software', t3s: 'e.g. Odoo, syndic software',
    t4: 'Another syndic app', t4s: 'Switching from a tool',
    painLabel: 'Biggest pain points? (select all that apply)',
    pp1: 'Chasing late payments', pp2: 'Organising AG meetings',
    pp3: 'Document chaos', pp4: 'Tracking compliance deadlines',
    pp5: 'Co-owner communication', pp6: 'Financial reporting',
    // Step 10
    s10t: 'Your priorities', s10sub: 'Pick 2–3 features to highlight on your dashboard.',
    pr1: 'Payment tracking', pr1s: 'Charges, reminders, collection',
    pr2: 'AG & assembly management', pr2s: 'Convocations, voting, minutes',
    pr3: 'Document management', pr3s: 'Store, organise, access all docs',
    pr4: 'Compliance tracking', pr4s: 'Certificates, inspections, deadlines',
    pr5: 'Co-owner portal', pr5s: 'Self-service requests & payments',
    pr6: 'Financial reporting', pr6s: 'Budget overview and AG reports',
    // Step 11
    s11t: 'Your workspace is ready', s11sub: "Here's what we'll create — and what to tackle next.",
    creatingNow: 'Creating now', doNext: 'To do next', yourPri: 'Your priorities',
    finishBtn: 'Launch my workspace →',
    creating: 'Setting up your workspace…',
    // Nav
    next: 'Next →', back: '← Back', skip: 'Skip for now',
  },
  fr: {
    prepTitle: 'Avant de commencer',
    prep: "Ce questionnaire prend environ 30 minutes. Préparez : numéro d'ACP, police d'assurance, liste des copropriétaires, chiffres financiers et certificats de conformité.",
    prepReassure: "Vous n'avez pas tout sous la main ? Pas de panique — nous vous guidons étape par étape.",
    langTitle: 'Bienvenue sur SyndicSage',
    langSub: 'Choisissez votre langue préférée pour commencer.',
    s2t: 'À propos de vous', s2sub: "Commençons par votre profil. Cela personnalise votre espace.",
    firstname: 'Prénom', lastname: 'Nom de famille', emailLabel: 'Adresse e-mail', phoneLabel: 'Téléphone',
    yearsLabel: "Années d'expérience comme syndic",
    y1: '< 1 an', y2: '1–3 ans', y3: '4–10 ans', y4: '10+ ans',
    roleLabel: 'Je suis…',
    r1: 'Syndic bénévole', r1s: 'VME autogérée',
    r2: 'Syndic professionnel', r2s: 'Gérant des immeubles pour des clients',
    volNote: "En tant que syndic bénévole, vous pouvez percevoir une indemnité approuvée par l'assemblée générale.",
    bcountLabel: "Combien d'immeubles gérez-vous ?",
    bc1: '1', bc1s: 'Un seul', bc2: '2–5', bc2s: 'Petit portefeuille', bc3: '6–15', bc3s: 'En croissance', bc4: '16+', bc4s: 'Grand portefeuille',
    s3t: 'Votre premier immeuble', s3sub: "Enregistrez l'immeuble que vous gérez principalement.",
    bname: 'Nom de l\'immeuble *', baddr: 'Adresse', bcity: 'Ville', byear: 'Année de construction', bfloors: 'Étages', bunits: 'Nombre de lots *',
    s4t: 'ACP & légal', s4sub: 'Ces données pré-remplissent vos convocations et dépôts officiels.',
    vmeQ: "Votre immeuble a-t-il un numéro d'ACP (BCE / KBO) ?",
    vmeYes: "Oui — je l'ai", vmeNo: 'Pas encore', vmeUnknown: "Je ne sais pas / je dois vérifier",
    vmeHint: 'Vous pouvez le rechercher gratuitement sur syndi.be',
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Acte de base / statuts',
    a1: "Je l'ai", a1s: 'Prêt à téléverser', a1note: "Parfait — nous vous montrerons où téléverser l'acte de base après la configuration.",
    a2: 'Téléverserai plus tard', a2s: 'Besoin de le retrouver',
    a3: "Je ne l'ai pas", a3s: 'Pas encore obtenu',
    rmeLabel: 'Règlement de copropriété',
    rme1: "Je l'ai", rme1s: 'Prêt à téléverser', rme1note: 'Parfait — nous vous montrerons où le téléverser après la configuration.',
    rme2: 'Téléverserai plus tard', rme2s: 'Besoin de le retrouver',
    rme3: "Je ne l'ai pas", rme3s: 'Pas encore obtenu',
    mandateQ: 'Avez-vous un mandat de syndic ?',
    mandateYes: "Oui — j'ai le PV de la première AG",
    mandateNo: "Pas encore — je dois l'obtenir",
    s5t: 'Finances', s5sub: 'Ces chiffres alimentent votre tableau de bord et vos rapports d\'AG.',
    bankQ: 'La VME dispose-t-elle d\'un compte bancaire ?',
    bankYes: 'Oui', bankUnsure: 'Pas sûr / je dois vérifier', bankNo: 'Non — pas encore ouvert',
    bankIban: 'IBAN du compte bancaire VME', bankName: 'Nom de la banque',
    bankTip: 'La loi belge oblige toute VME à avoir un compte en son propre nom. Options : BNP Paribas Fortis (~10 €/trimestre), Argenta (gratuit pour les VME).',
    s6t: 'Assurances', s6sub: "Renseignons les détails d'assurance de votre VME.",
    insQ: 'La VME a-t-elle une assurance incendie ?',
    insYes: 'Oui — police active', insNo: 'Pas encore / incertain',
    insurer: "Compagnie d'assurance", policyNo: 'Numéro de police', insRenewal: 'Date de renouvellement',
    insTip: "L'assurance RC est légalement obligatoire pour le syndic (art. 577-9 Code civil belge). L'assurance incendie est vivement recommandée.",
    s7t: 'Copropriétaires', s7sub: 'Cela nous aide à configurer le portail et le suivi des paiements.',
    ownerCount: 'Nombre approximatif de copropriétaires',
    ownerInfoLabel: 'La liste de contacts des copropriétaires est…',
    oi1: 'Complète', oi1s: 'Noms, emails & lots prêts',
    oi2: 'Partielle', oi2s: 'Certaines infos manquantes',
    oi3: 'Pas encore', oi3s: "J'ajouterai manuellement",
    portalQ: 'Activer le portail copropriétaires ?',
    p1: 'Oui, maintenant', p1s: 'Les copropriétaires peuvent se connecter',
    p2: 'Plus tard', p2s: "Je le configurerai quand prêt",
    s8t: 'Checklist de conformité', s8sub: 'Sélectionnez les certificats que vous avez en dossier.',
    c1: 'Inspection électrique (RGIE)', c1s: 'Requise tous les 25 ans',
    c2: 'Inspection ascenseur', c2s: 'Inspection annuelle obligatoire',
    c3: 'Inspection sécurité incendie', c3s: 'Détecteurs, extincteurs, sorties',
    c4: 'Inventaire amiante', c4s: "Obligatoire pour les bâtiments avant 2001",
    c5: 'Inspection gaz / chauffage', c5s: 'Certificat chaudière & installation gaz',
    c6: 'Certificat PEB (zones communes)', c6s: 'Performance énergétique',
    c7: 'Aucun en dossier', c7s: "J'ajouterai au fur et à mesure",
    s9t: 'Votre workflow actuel', s9sub: "Dites-nous comment vous gérez aujourd'hui.",
    toolLabel: "Comment gérez-vous vos immeubles aujourd'hui ?",
    t1: 'Excel / Google Sheets', t2: 'Papier & classeurs',
    t3: 'Logiciel générique', t3s: 'ex. Odoo, logiciel syndic',
    t4: 'Autre application syndic', t4s: "Changement d'outil",
    painLabel: 'Vos principaux points de douleur ? (sélectionnez tout ce qui s\'applique)',
    pp1: 'Relancer les paiements en retard', pp2: 'Organiser les AG',
    pp3: 'Chaos documentaire', pp4: 'Suivi des délais de conformité',
    pp5: 'Communication copropriétaires', pp6: 'Rapports financiers',
    s10t: 'Vos priorités', s10sub: 'Choisissez 2–3 fonctionnalités à mettre en avant.',
    pr1: 'Suivi des paiements', pr1s: 'Charges, relances, encaissements',
    pr2: 'Gestion AG & assemblées', pr2s: 'Convocations, votes, PV',
    pr3: 'Gestion documentaire', pr3s: 'Stocker, organiser, accéder aux docs',
    pr4: 'Suivi de conformité', pr4s: 'Certificats, inspections, délais',
    pr5: 'Portail copropriétaires', pr5s: 'Demandes et paiements en ligne',
    pr6: 'Rapports financiers', pr6s: "Budget et rapports d'AG",
    s11t: 'Votre espace est prêt', s11sub: 'Voici ce que nous allons créer — et ce qu\'il reste à faire.',
    creatingNow: 'En cours de création', doNext: 'À faire ensuite', yourPri: 'Vos priorités',
    finishBtn: 'Lancer mon espace →',
    creating: 'Configuration en cours…',
    next: 'Suivant →', back: '← Retour', skip: 'Passer pour l\'instant',
  },
  nl: {
    prepTitle: 'Voordat u begint',
    prep: 'Deze vragenlijst duurt ongeveer 30 minuten. Zorg dat u bij de hand heeft: VME-nummer, verzekeringspolis, lijst mede-eigenaars, financiële cijfers en conformiteitscertificaten.',
    prepReassure: 'Heeft u niet alles bij de hand? Geen zorgen — we begeleiden u stap voor stap.',
    langTitle: 'Welkom bij SyndicSage',
    langSub: 'Kies uw voorkeurstaal om te beginnen.',
    s2t: 'Over u', s2sub: 'Laten we beginnen met wie u bent. Dit personaliseert uw werkruimte.',
    firstname: 'Voornaam', lastname: 'Achternaam', emailLabel: 'E-mailadres', phoneLabel: 'Telefoonnummer',
    yearsLabel: 'Jaren ervaring als syndicus',
    y1: '< 1 jaar', y2: '1–3 jaar', y3: '4–10 jaar', y4: '10+ jaar',
    roleLabel: 'Ik ben een…',
    r1: 'Vrijwillige syndicus', r1s: 'Zelfbeherende VME',
    r2: 'Professionele syndicus', r2s: 'Gebouwen beheren voor klanten',
    volNote: 'Als vrijwillige syndicus kunt u een vergoeding ontvangen goedgekeurd door de algemene vergadering.',
    bcountLabel: 'Hoeveel gebouwen beheert u?',
    bc1: '1', bc1s: 'Slechts één', bc2: '2–5', bc2s: 'Klein portefeuille', bc3: '6–15', bc3s: 'Groeiend', bc4: '16+', bc4s: 'Groot portefeuille',
    s3t: 'Uw eerste gebouw', s3sub: 'Registreer het gebouw dat u het meest beheert.',
    bname: 'Naam gebouw *', baddr: 'Adres', bcity: 'Stad', byear: 'Bouwjaar', bfloors: 'Verdiepingen', bunits: 'Aantal kavels *',
    s4t: 'VME & juridisch', s4sub: 'Deze gegevens vullen uw oproepingsbrieven vooraf in.',
    vmeQ: 'Heeft uw gebouw een VME-nummer (BCE / KBO)?',
    vmeYes: 'Ja — en ik heb het', vmeNo: 'Nog niet', vmeUnknown: 'Ik weet het niet / moet nakijken',
    vmeHint: 'U kunt het gratis opzoeken op syndi.be',
    vmePH: 'BE 0123.456.789',
    acteLabel: 'Basisakte / statuten',
    a1: 'Ik heb het', a1s: 'Klaar om te uploaden', a1note: 'Goed — we tonen u waar u de basisakte kunt uploaden na de setup.',
    a2: 'Upload later', a2s: 'Moet het zoeken',
    a3: 'Heb ik niet', a3s: 'Nog niet verkregen',
    rmeLabel: 'Reglement van mede-eigendom',
    rme1: 'Ik heb het', rme1s: 'Klaar om te uploaden', rme1note: 'Goed — we tonen u waar u het reglement kunt uploaden na de setup.',
    rme2: 'Upload later', rme2s: 'Moet het zoeken',
    rme3: 'Heb ik niet', rme3s: 'Nog niet verkregen',
    mandateQ: 'Heeft u een syndicusmandaat?',
    mandateYes: 'Ja — ik heb het PV van de eerste AV',
    mandateNo: 'Nog niet — ik moet het nog verkrijgen',
    s5t: 'Financiën', s5sub: 'Deze cijfers voeden uw dashboard en AV-rapportsjablonen.',
    bankQ: 'Heeft de VME een bankrekening?',
    bankYes: 'Ja', bankUnsure: 'Niet zeker / moet nakijken', bankNo: 'Nee — nog niet geopend',
    bankIban: 'IBAN VME-bankrekening', bankName: 'Naam bank',
    bankTip: "Belgische wet verplicht elke VME een bankrekening op eigen naam. Opties: BNP Paribas Fortis (~€10/kwartaal), Argenta (gratis voor VME's).",
    s6t: 'Verzekeringen', s6sub: 'Laten we de verzekeringsgegevens van uw VME vastleggen.',
    insQ: 'Heeft de VME een brandverzekering?',
    insYes: 'Ja — actieve polis', insNo: 'Nog niet / onzeker',
    insurer: 'Verzekeringsmaatschappij', policyNo: 'Polisnummer', insRenewal: 'Verlengingsdatum',
    insTip: 'Aansprakelijkheidsverzekering is wettelijk verplicht voor de syndicus (art. 577-9 BW). Brandverzekering is sterk aanbevolen.',
    s7t: 'Mede-eigenaars', s7sub: 'Dit helpt ons het portaal en betalingsbeheer in te stellen.',
    ownerCount: 'Ongeveer aantal mede-eigenaars',
    ownerInfoLabel: 'Hoe volledig is uw contactlijst?',
    oi1: 'Volledig', oi1s: 'Namen, e-mails & kavels klaar',
    oi2: 'Gedeeltelijk', oi2s: 'Sommige info ontbreekt',
    oi3: 'Nog niet', oi3s: 'Voeg handmatig toe',
    portalQ: 'Mede-eigenaarportaal activeren?',
    p1: 'Ja, onmiddellijk', p1s: 'Eigenaars kunnen direct inloggen',
    p2: 'Later', p2s: 'Ik stel het in wanneer klaar',
    s8t: 'Conformiteitslijst', s8sub: 'Selecteer welke keuringen en certificaten u in dossier heeft.',
    c1: 'Elektrische keuring (AREI)', c1s: 'Vereist om de 25 jaar',
    c2: 'Liftkeuring', c2s: 'Jaarlijkse verplichte keuring',
    c3: 'Brandbeveiligingskeuring', c3s: 'Rookmelders, blusapparaten, vluchtwegen',
    c4: 'Asbestinventaris', c4s: 'Verplicht voor gebouwen van vóór 2001',
    c5: 'Gas / verwarmingskeuring', c5s: 'Ketel & gasinstallatie certificaat',
    c6: 'Energieprestatiecertificaat (EPC)', c6s: 'Voor gemeenschappelijke delen',
    c7: 'Niets in dossier', c7s: 'Ik voeg toe naarmate ik verzamel',
    s9t: 'Uw huidige werkwijze', s9sub: 'Help ons begrijpen hoe u vandaag beheert.',
    toolLabel: 'Hoe beheert u uw gebouwen vandaag?',
    t1: 'Excel / Google Sheets', t2: 'Papier & ordners',
    t3: 'Generieke software', t3s: 'bijv. Odoo, syndicussoftware',
    t4: 'Andere syndicus-app', t4s: 'Overstap van een tool',
    painLabel: 'Uw grootste pijnpunten? (selecteer alles wat van toepassing is)',
    pp1: 'Achterstallige betalingen opvolgen', pp2: 'AV-vergaderingen organiseren',
    pp3: 'Documentenchaos', pp4: 'Conformiteitsdeadlines bijhouden',
    pp5: 'Communicatie mede-eigenaars', pp6: 'Financiële rapportage',
    s10t: 'Uw prioriteiten', s10sub: 'Kies 2–3 functies om te markeren op uw dashboard.',
    pr1: 'Betalingsbeheer', pr1s: 'Bijdragen, herinneringen, inning',
    pr2: 'AV & vergaderbeheer', pr2s: 'Oproepingen, stemming, notulen',
    pr3: 'Documentbeheer', pr3s: 'Opslaan, organiseren en raadplegen',
    pr4: 'Conformiteitsopvolging', pr4s: 'Certificaten, keuringen, deadlines',
    pr5: 'Mede-eigenaarportaal', pr5s: 'Zelfbedieningsverzoeken & online betalingen',
    pr6: 'Financiële rapportage', pr6s: 'Budget en financiële AV-rapporten',
    s11t: 'Uw werkruimte is klaar', s11sub: 'Dit is wat we aanmaken — en wat u daarna kunt aanpakken.',
    creatingNow: 'Nu aanmaken', doNext: 'Vervolgens te doen', yourPri: 'Uw prioriteiten',
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

  function toggleArr(key: 'compliance' | 'painPoints' | 'priorities', val: string) {
    setOb(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })
  }

  function canNext(): boolean {
    if (step === 3) {
      const nameOk  = ob.bName.trim().length > 0 && ob.bName.trim().length <= 100
      const cityOk  = ob.bCity.trim().length > 0 && ob.bCity.trim().length <= 100
      const unitsOk = !!ob.bUnits.trim()
      return nameOk && cityOk && unitsOk
    }
    if (step === 5 && ob.hasBankAccount === 'yes' && ob.bankIban.trim()) {
      const iban = ob.bankIban.replace(/\s/g, '').toUpperCase()
      const ibanOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban)
      return ibanOk
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
      const { data: building, error: buildingErr } = await supabase
        .from('buildings')
        .insert({
          organization_id: org.id,
          name:            ob.bName.trim(),
          address:         ob.bAddress.trim() || 'TBD',
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
          ob_years_exp:      ob.yearsExp,
          ob_building_count: ob.buildingCount,
          ob_has_acte:       ob.hasActe,
          ob_has_rme:        ob.hasRME,
          ob_wants_portal:   ob.wantsPortal,
          ob_current_tool:   ob.currentTool,
          ob_pain_points:    ob.painPoints.join(','),
          ob_priorities:     ob.priorities.join(','),
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

          {/* Progress + security note */}
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

                {/* Warning notice */}
                <div style={{ border: '1.5px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {v.prepTitle}
                  </div>
                  <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6, margin: '0 0 6px' }}>{v.prep}</p>
                  <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>{v.prepReassure}</p>
                </div>

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

            {/* STEP 2 — About you */}
            {step === 2 && (
              <div>
                <h2 style={css.title}>{v.s2t}</h2>
                <p style={css.sub}>{v.s2sub}</p>
                <div style={{ ...css.grid2, marginBottom: 12 }}>
                  <Field label={v.firstname}><input style={css.input} value={ob.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jean" autoFocus /></Field>
                  <Field label={v.lastname}><input style={css.input} value={ob.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dupont" /></Field>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Field label={v.phoneLabel}><input style={css.input} value={ob.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 470 00 00 00" type="tel" /></Field>
                </div>
                <Field label={v.yearsLabel}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['lt1', v.y1], ['1to3', v.y2], ['4to10', v.y3], ['10plus', v.y4]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('yearsExp', val)} style={css.card(ob.yearsExp === val)}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label={v.roleLabel} style={{ marginTop: 14 }}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['non_professional', v.r1, v.r1s], ['professional', v.r2, v.r2s]] as [string, string, string][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('role', val)} style={css.card(ob.role === val)}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </Field>
                {ob.role === 'non_professional' && <div style={css.tip}>{v.volNote}</div>}
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

            {/* STEP 3 — First building */}
            {step === 3 && (
              <div>
                <h2 style={css.title}>{v.s3t}</h2>
                <p style={css.sub}>{v.s3sub}</p>
                <Field label={v.bname} style={{ marginBottom: 12 }}><input style={css.input} value={ob.bName} onChange={e => set('bName', e.target.value)} placeholder="Résidence du Parc" autoFocus /></Field>
                <Field label={v.baddr} style={{ marginBottom: 12 }}><input style={css.input} value={ob.bAddress} onChange={e => set('bAddress', e.target.value)} placeholder="Rue de la Loi 1" /></Field>
                <Field label={v.bcity} style={{ marginBottom: 12 }}><input style={css.input} value={ob.bCity} onChange={e => set('bCity', e.target.value)} placeholder="Bruxelles" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label={v.byear}><input style={css.input} value={ob.bYear} onChange={e => set('bYear', e.target.value)} placeholder="1985" type="number" /></Field>
                  <Field label={v.bfloors}><input style={css.input} value={ob.bFloors} onChange={e => set('bFloors', e.target.value)} placeholder="6" type="number" /></Field>
                  <Field label={v.bunits}><input style={css.input} value={ob.bUnits} onChange={e => set('bUnits', e.target.value)} placeholder="24" type="number" /></Field>
                </div>
              </div>
            )}

            {/* STEP 4 — VME & legal */}
            {step === 4 && (
              <div>
                <h2 style={css.title}>{v.s4t}</h2>
                <p style={css.sub}>{v.s4sub}</p>
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
                </Field>
                <Field label={v.mandateQ}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['yes', v.mandateYes], ['no', v.mandateNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasMandate', val)} style={css.card(ob.hasMandate === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 5 — Financials */}
            {step === 5 && (
              <div>
                <h2 style={css.title}>{v.s5t}</h2>
                <p style={css.sub}>{v.s5sub}</p>
                <Field label={v.bankQ} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid3, marginTop: 6 }}>
                    {([['yes', v.bankYes], ['unsure', v.bankUnsure], ['no', v.bankNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasBankAccount', val)} style={css.card(ob.hasBankAccount === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
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
                {(ob.hasBankAccount === 'unsure' || ob.hasBankAccount === 'no') && <div style={css.tip}>{v.bankTip}</div>}
              </div>
            )}

            {/* STEP 6 — Insurance */}
            {step === 6 && (
              <div>
                <h2 style={css.title}>{v.s6t}</h2>
                <p style={css.sub}>{v.s6sub}</p>
                <Field label={v.insQ} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['yes', v.insYes], ['no', v.insNo]] as [string, string][]).map(([val, label]) => (
                      <div key={val} onClick={() => set('hasInsurance', val)} style={css.card(ob.hasInsurance === val)}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
                      </div>
                    ))}
                  </div>
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

            {/* STEP 7 — Co-owners */}
            {step === 7 && (
              <div>
                <h2 style={css.title}>{v.s7t}</h2>
                <p style={css.sub}>{v.s7sub}</p>
                <Field label={v.ownerCount} style={{ marginBottom: 14 }}><input style={{ ...css.input, maxWidth: 160 }} value={ob.ownerCount} onChange={e => set('ownerCount', e.target.value)} placeholder="12" type="number" autoFocus /></Field>
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

            {/* STEP 8 — Compliance */}
            {step === 8 && (
              <div>
                <h2 style={css.title}>{v.s8t}</h2>
                <p style={css.sub}>{v.s8sub}</p>
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

            {/* STEP 9 — Workflow */}
            {step === 9 && (
              <div>
                <h2 style={css.title}>{v.s9t}</h2>
                <p style={css.sub}>{v.s9sub}</p>
                <Field label={v.toolLabel} style={{ marginBottom: 16 }}>
                  <div style={{ ...css.grid2, marginTop: 6 }}>
                    {([['excel', v.t1], ['paper', v.t2], ['generic', v.t3, v.t3s], ['other', v.t4, v.t4s]] as [string, string, string?][]).map(([val, title, sub]) => (
                      <div key={val} onClick={() => set('currentTool', val)} style={css.card(ob.currentTool === val)}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                        {sub && <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{sub}</div>}
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label={v.painLabel}>
                  {([['payments', v.pp1], ['ag', v.pp2], ['docs', v.pp3], ['compliance', v.pp4], ['comms', v.pp5], ['reporting', v.pp6]] as [string, string][]).map(([val, label]) => (
                    <div key={val} onClick={() => toggleArr('painPoints', val)} style={css.checkCard(ob.painPoints.includes(val))}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${ob.painPoints.includes(val) ? '#1E3A5F' : 'rgba(60,60,67,0.3)'}`, background: ob.painPoints.includes(val) ? '#1E3A5F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {ob.painPoints.includes(val) && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E3A5F' }}>{label}</span>
                    </div>
                  ))}
                </Field>
              </div>
            )}

            {/* STEP 10 — Priorities */}
            {step === 10 && (
              <div>
                <h2 style={css.title}>{v.s10t}</h2>
                <p style={css.sub}>{v.s10sub}</p>
                {([['payments', v.pr1, v.pr1s], ['ag', v.pr2, v.pr2s], ['documents', v.pr3, v.pr3s], ['compliance', v.pr4, v.pr4s], ['portal', v.pr5, v.pr5s], ['reporting', v.pr6, v.pr6s]] as [string, string, string][]).map(([val, title, sub]) => (
                  <div key={val} onClick={() => toggleArr('priorities', val)} style={css.checkCard(ob.priorities.includes(val))}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${ob.priorities.includes(val) ? '#F59E0B' : 'rgba(60,60,67,0.3)'}`, background: ob.priorities.includes(val) ? '#F59E0B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ob.priorities.includes(val) && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{title}</div>
                      <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 1 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 11 — Summary */}
            {step === 11 && (
              <div>
                <h2 style={css.title}>{v.s11t}</h2>
                <p style={css.sub}>{v.s11sub}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
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
                    {[ob.hasActe !== 'yes' && '📄 Upload acte de base', ob.hasRME !== 'yes' && '📋 Upload RME', ob.hasBankAccount !== 'yes' && '🏦 Add VME bank account', '👥 Add co-owners'].filter(Boolean).slice(0, 4).map(item => (
                      <div key={String(item)} style={{ fontSize: 12, color: '#92400E', marginBottom: 6 }}>→ {item}</div>
                    ))}
                  </div>
                </div>

                {ob.priorities.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{v.yourPri}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ob.priorities.map(p => (
                        <span key={p} style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F', background: 'rgba(30,58,95,0.08)', padding: '4px 10px', borderRadius: 20 }}>
                          {p === 'payments' ? v.pr1 : p === 'ag' ? v.pr2 : p === 'documents' ? v.pr3 : p === 'compliance' ? v.pr4 : p === 'portal' ? v.pr5 : v.pr6}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
              {step < TOTAL_STEPS && step > 1 && (
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
