import { addDays, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";

export const PREGNANCY_TOTAL_DAYS = 280; // 40 weeks

export function computeDueDateFromLmp(lmp: Date): Date {
  return addDays(lmp, PREGNANCY_TOTAL_DAYS);
}

export function computeLmpFromDueDate(due: Date): Date {
  return addDays(due, -PREGNANCY_TOTAL_DAYS);
}

export interface PregnancyState {
  daysPregnant: number;
  daysRemaining: number;
  week: number; // 1..40
  dayOfWeek: number; // 0..6
  month: number; // 1..9
  trimester: 1 | 2 | 3;
  progress: number; // 0..1
  dueDate: Date;
  lmpDate: Date;
  formattedDue: string;
  saLabel: string; // "32 SA + 3j"
}

export function getPregnancyState(lmp: Date, today: Date = new Date()): PregnancyState {
  const lmpStart = new Date(lmp.getFullYear(), lmp.getMonth(), lmp.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysPregnant = Math.max(0, Math.min(PREGNANCY_TOTAL_DAYS, differenceInDays(t, lmpStart)));
  const due = computeDueDateFromLmp(lmpStart);
  const daysRemaining = Math.max(0, differenceInDays(due, t));
  const week = Math.min(40, Math.floor(daysPregnant / 7) + 1);
  const dayOfWeek = daysPregnant % 7;
  const month = Math.min(9, Math.max(1, Math.ceil(week / 4.5)));
  const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return {
    daysPregnant,
    daysRemaining,
    week,
    dayOfWeek,
    month,
    trimester,
    progress: daysPregnant / PREGNANCY_TOTAL_DAYS,
    dueDate: due,
    lmpDate: lmpStart,
    formattedDue: format(due, "d MMMM yyyy", { locale: fr }),
    saLabel: `${Math.min(41, week + 1)} SA + ${dayOfWeek}j`,
  };
}

export interface WeekInfo {
  week: number;
  sizeMm: number;
  weightG: number;
  fruit: string;
  fruitEmoji: string;
  highlights: string[];
  tips: string[];
  avoid: string[];
}

// Compact dataset for weeks 1-40. Approximate clinical references.
export const WEEKS: WeekInfo[] = [
  { week: 1, sizeMm: 0.1, weightG: 0, fruit: "grain de pavot", fruitEmoji: "🌱", highlights: ["Le compte commence à partir des dernières règles.", "L'ovulation et la conception n'ont pas encore eu lieu."], tips: ["Prenez 400 µg d'acide folique par jour.", "Arrêtez alcool et tabac."], avoid: ["Alcool", "Tabac", "Médicaments sans avis médical"] },
  { week: 2, sizeMm: 0.1, weightG: 0, fruit: "grain de pavot", fruitEmoji: "🌱", highlights: ["L'ovulation se produit, la fécondation est possible.", "Le corps prépare la muqueuse utérine."], tips: ["Continuez l'acide folique.", "Adoptez une alimentation équilibrée."], avoid: ["Stress excessif", "Substances toxiques"] },
  { week: 3, sizeMm: 0.2, weightG: 0, fruit: "grain de sésame", fruitEmoji: "🌾", highlights: ["L'œuf fécondé descend vers l'utérus.", "Les premières cellules se multiplient."], tips: ["Hydratez-vous bien.", "Reposez-vous suffisamment."], avoid: ["Rayons X", "Médicaments tératogènes"] },
  { week: 4, sizeMm: 1, weightG: 0, fruit: "graine de pomme", fruitEmoji: "🍎", highlights: ["L'embryon s'implante dans l'utérus.", "Les premiers tissus se forment."], tips: ["Faites un test de grossesse.", "Prenez un rendez-vous médical."], avoid: ["Alcool", "Tabac", "Saunas chauds"] },
  { week: 5, sizeMm: 2, weightG: 0, fruit: "graine de sésame", fruitEmoji: "🌾", highlights: ["Le tube neural commence à se former.", "Le cœur primitif apparaît."], tips: ["Consultez votre médecin.", "Commencez les vitamines prénatales."], avoid: ["Charcuterie crue", "Fromages au lait cru"] },
  { week: 6, sizeMm: 4, weightG: 0, fruit: "petit pois", fruitEmoji: "🟢", highlights: ["Le cœur bat à 100 bpm.", "Les bourgeons des bras apparaissent."], tips: ["Mangez par petites portions.", "Buvez beaucoup d'eau."], avoid: ["Aliments très épicés", "Caféine en excès"] },
  { week: 7, sizeMm: 10, weightG: 1, fruit: "myrtille", fruitEmoji: "🫐", highlights: ["Le cerveau se développe rapidement.", "Les bras et jambes s'allongent."], tips: ["Reposez-vous dès que possible.", "Évitez les odeurs fortes."], avoid: ["Poissons riches en mercure", "Viande crue"] },
  { week: 8, sizeMm: 16, weightG: 1, fruit: "framboise", fruitEmoji: "🍓", highlights: ["Les doigts commencent à se former.", "Les paupières apparaissent."], tips: ["Première échographie bientôt.", "Notez vos symptômes."], avoid: ["Sushis", "Fromages au lait cru"] },
  { week: 9, sizeMm: 23, weightG: 2, fruit: "cerise", fruitEmoji: "🍒", highlights: ["Le bébé bouge déjà (imperceptible).", "Le visage prend forme."], tips: ["Mangez des aliments riches en fer.", "Marchez chaque jour."], avoid: ["Stress", "Alcool"] },
  { week: 10, sizeMm: 31, weightG: 4, fruit: "fraise", fruitEmoji: "🍓", highlights: ["Tous les organes vitaux sont en place.", "Les ongles commencent à pousser."], tips: ["Pratiquez une activité douce.", "Dormez 8h par nuit."], avoid: ["Sports à risque de chute"] },
  { week: 11, sizeMm: 41, weightG: 7, fruit: "citron vert", fruitEmoji: "🟢", highlights: ["Le bébé peut ouvrir et fermer les poings.", "Le diaphragme se développe."], tips: ["Échographie du 1er trimestre.", "Hydratez votre peau."], avoid: ["Vêtements trop serrés"] },
  { week: 12, sizeMm: 54, weightG: 14, fruit: "prune", fruitEmoji: "🍑", highlights: ["Fin du premier trimestre !", "Le sexe peut parfois être identifié."], tips: ["Annoncez la nouvelle si vous le souhaitez.", "Continuez les vitamines."], avoid: ["Aliments crus à risque"] },
  { week: 13, sizeMm: 74, weightG: 23, fruit: "pêche", fruitEmoji: "🍑", highlights: ["Les cordes vocales se forment.", "Le bébé a des empreintes digitales."], tips: ["Achetez des vêtements de grossesse.", "Reprenez de l'énergie."], avoid: ["Tabac passif"] },
  { week: 14, sizeMm: 87, weightG: 43, fruit: "citron", fruitEmoji: "🍋", highlights: ["Le bébé fait des grimaces.", "Du duvet (lanugo) recouvre son corps."], tips: ["Étirez-vous régulièrement.", "Préparez la chambre."], avoid: ["Positions allongées prolongées sur le dos"] },
  { week: 15, sizeMm: 100, weightG: 70, fruit: "pomme", fruitEmoji: "🍎", highlights: ["Le bébé entend les sons étouffés.", "Les os durcissent."], tips: ["Parlez à votre bébé.", "Mettez de la musique douce."], avoid: ["Bruit excessif"] },
  { week: 16, sizeMm: 115, weightG: 100, fruit: "avocat", fruitEmoji: "🥑", highlights: ["Vous sentirez bientôt les premiers mouvements.", "Le bébé peut faire la grimace."], tips: ["2ème échographie bientôt.", "Photographiez votre ventre chaque semaine."], avoid: ["Talons hauts"] },
  { week: 17, sizeMm: 130, weightG: 140, fruit: "poire", fruitEmoji: "🍐", highlights: ["Le squelette se renforce.", "Le bébé développe la graisse brune."], tips: ["Dormez sur le côté gauche.", "Mangez plus de calcium."], avoid: ["Caféine en excès"] },
  { week: 18, sizeMm: 142, weightG: 190, fruit: "poivron", fruitEmoji: "🫑", highlights: ["Premiers mouvements perceptibles.", "Le bébé bâille et s'étire."], tips: ["Notez les mouvements.", "Inscrivez-vous à un cours prénatal."], avoid: ["Stress intense"] },
  { week: 19, sizeMm: 152, weightG: 240, fruit: "tomate", fruitEmoji: "🍅", highlights: ["Le bébé entend votre voix.", "Le vernix protège sa peau."], tips: ["Lisez-lui des histoires.", "Hydratez votre peau."], avoid: ["Crèmes contenant rétinol"] },
  { week: 20, sizeMm: 165, weightG: 300, fruit: "banane", fruitEmoji: "🍌", highlights: ["Mi-grossesse atteinte !", "Échographie morphologique."], tips: ["Demandez les photos d'écho.", "Profitez d'un moment pour vous."], avoid: ["Aliments trop salés"] },
  { week: 21, sizeMm: 270, weightG: 360, fruit: "carotte", fruitEmoji: "🥕", highlights: ["Le bébé avale du liquide amniotique.", "Ses papilles gustatives se développent."], tips: ["Variez votre alimentation.", "Mangez des fruits frais."], avoid: ["Aliments très sucrés"] },
  { week: 22, sizeMm: 285, weightG: 430, fruit: "courgette", fruitEmoji: "🥒", highlights: ["Le bébé entend les sons internes.", "Ses paupières s'ouvrent."], tips: ["Échangez avec d'autres futures mamans.", "Préparez votre liste de naissance."], avoid: ["Soulever des charges lourdes"] },
  { week: 23, sizeMm: 300, weightG: 500, fruit: "mangue", fruitEmoji: "🥭", highlights: ["Le bébé réagit aux sons forts.", "Le pancréas se développe."], tips: ["Contrôlez votre glycémie.", "Marchez quotidiennement."], avoid: ["Sucres rapides"] },
  { week: 24, sizeMm: 315, weightG: 600, fruit: "épi de maïs", fruitEmoji: "🌽", highlights: ["Le bébé est viable !", "Ses poumons produisent du surfactant."], tips: ["Test de glycémie.", "Apprenez la respiration."], avoid: ["Tabac"] },
  { week: 25, sizeMm: 340, weightG: 730, fruit: "chou-fleur", fruitEmoji: "🥦", highlights: ["Le bébé a des cycles veille-sommeil.", "Ses cheveux ont une couleur."], tips: ["Préparez la valise de maternité.", "Visitez la maternité."], avoid: ["Voyages longs"] },
  { week: 26, sizeMm: 358, weightG: 870, fruit: "laitue", fruitEmoji: "🥬", highlights: ["Les yeux du bébé s'ouvrent.", "Il bouge beaucoup."], tips: ["Comptez les mouvements.", "Reposez-vous davantage."], avoid: ["Positions inconfortables"] },
  { week: 27, sizeMm: 365, weightG: 1000, fruit: "aubergine", fruitEmoji: "🍆", highlights: ["Fin du 2ème trimestre.", "Le bébé pèse 1 kg !"], tips: ["Cours de préparation à l'accouchement.", "Discutez du plan de naissance."], avoid: ["Stress au travail"] },
  { week: 28, sizeMm: 375, weightG: 1100, fruit: "grosse aubergine", fruitEmoji: "🍆", highlights: ["Le bébé rêve probablement.", "Sa peau devient moins ridée."], tips: ["3ème échographie.", "Rendez-vous mensuels."], avoid: ["Conduite longue"] },
  { week: 29, sizeMm: 385, weightG: 1250, fruit: "courge butternut", fruitEmoji: "🎃", highlights: ["Les muscles et poumons grandissent.", "Le bébé prend du poids."], tips: ["Mangez plus de protéines.", "Reposez-vous."], avoid: ["Sodas"] },
  { week: 30, sizeMm: 395, weightG: 1400, fruit: "chou", fruitEmoji: "🥬", highlights: ["Le cerveau se développe vite.", "Le bébé voit la lumière."], tips: ["Préparez la chambre.", "Reposez-vous."], avoid: ["Surcharge d'activités"] },
  { week: 31, sizeMm: 410, weightG: 1600, fruit: "noix de coco", fruitEmoji: "🥥", highlights: ["Le bébé tourne la tête.", "Ses os se durcissent."], tips: ["Mangez du calcium et vitamine D.", "Yoga prénatal."], avoid: ["Cigarette de l'entourage"] },
  { week: 32, sizeMm: 420, weightG: 1800, fruit: "jicama", fruitEmoji: "🥔", highlights: ["Le bébé pratique la respiration.", "Ses ongles atteignent le bout des doigts."], tips: ["Surveillez la tension.", "Hydratez-vous."], avoid: ["Aliments trop salés"] },
  { week: 33, sizeMm: 435, weightG: 2000, fruit: "ananas", fruitEmoji: "🍍", highlights: ["Le bébé reconnaît votre voix.", "Son système immunitaire se renforce."], tips: ["Préparez l'allaitement.", "Massez votre ventre."], avoid: ["Stress"] },
  { week: 34, sizeMm: 450, weightG: 2200, fruit: "melon cantaloup", fruitEmoji: "🍈", highlights: ["Les poumons sont presque matures.", "Le bébé se positionne tête en bas."], tips: ["Cours sur l'accouchement.", "Pratiquez la relaxation."], avoid: ["Long trajet"] },
  { week: 35, sizeMm: 460, weightG: 2400, fruit: "melon", fruitEmoji: "🍈", highlights: ["Le bébé prend 200-300g par semaine.", "Ses reins sont matures."], tips: ["Préparez la valise.", "Repérez l'hôpital."], avoid: ["Activité physique intense"] },
  { week: 36, sizeMm: 475, weightG: 2600, fruit: "salade romaine", fruitEmoji: "🥬", highlights: ["Le bébé est presque à terme.", "Sa peau devient lisse et rose."], tips: ["Visite hebdomadaire.", "Reposez-vous beaucoup."], avoid: ["Voyages longs"] },
  { week: 37, sizeMm: 485, weightG: 2900, fruit: "blette", fruitEmoji: "🥬", highlights: ["Le bébé est à terme !", "Il s'entraîne à respirer et téter."], tips: ["Surveillez les signes de travail.", "Restez calme."], avoid: ["Stress inutile"] },
  { week: 38, sizeMm: 495, weightG: 3100, fruit: "poireau", fruitEmoji: "🥬", highlights: ["Le bébé peut naître à tout moment.", "Ses cordes vocales sont prêtes."], tips: ["Préparez le retour à la maison.", "Restez en contact avec la sage-femme."], avoid: ["Inquiétude excessive"] },
  { week: 39, sizeMm: 505, weightG: 3300, fruit: "mini pastèque", fruitEmoji: "🍉", highlights: ["Le bébé est complètement développé.", "Il pèse environ 3,3 kg."], tips: ["Marchez doucement.", "Hydratez-vous bien."], avoid: ["Activité intense"] },
  { week: 40, sizeMm: 515, weightG: 3500, fruit: "pastèque", fruitEmoji: "🍉", highlights: ["Terme atteint !", "Votre bébé est prêt à naître."], tips: ["Profitez des derniers moments.", "Soyez prête pour la maternité."], avoid: ["Panique - tout est prêt !"] },
];

export function weekInfo(week: number): WeekInfo {
  const w = Math.max(1, Math.min(40, week));
  return WEEKS[w - 1];
}

export function formatSize(mm: number): string {
  if (mm < 10) return `${mm.toFixed(1)} mm`;
  if (mm < 100) return `${mm.toFixed(0)} mm`;
  return `${(mm / 10).toFixed(1)} cm`;
}

export function formatWeight(g: number): string {
  if (g < 1) return "—";
  if (g < 1000) return `${g} g`;
  return `${(g / 1000).toFixed(2)} kg`;
}