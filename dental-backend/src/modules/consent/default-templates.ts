/**
 * Default consent template library — 8 core + 4 optional, English baseline.
 *
 * Each template body is a structured JSON object (rendered to PDF by
 * ConsentPdfService). Admins can replace/edit per clinic; AI translation
 * generates equivalent localised versions for hi/ta/te/kn/ml/mr/bn/gu/pa.
 *
 * Wording is paraphrased from common Indian dental clinic consent forms
 * (see attached reference samples) and kept generic — no verbatim copy.
 */

export interface ConsentTemplateBody {
  /** Short summary printed below the title. */
  intro?: string;
  /** Procedure declaration — placeholder `{procedure}` will be replaced. */
  procedure_clause?: string;
  /** Optional anaesthesia options the patient ticks. */
  anaesthesia_options?: string[];
  /** Sections: heading + paragraphs and/or bullet list. */
  sections: Array<{
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
  /** Final consent paragraph the patient agrees to. */
  consent_statement: string;
  /** Witness/doctor attestation paragraph (optional). */
  doctor_statement?: string;
  /** Signature lines printed at the bottom — order matters. */
  signature_lines: Array<'patient' | 'guardian' | 'witness' | 'doctor'>;
}

export interface ConsentTemplateSeed {
  code: string;
  title: string;
  is_default: boolean;
  body: ConsentTemplateBody;
}

export const DEFAULT_CONSENT_TEMPLATES: ConsentTemplateSeed[] = [
  // ─────────────────────────── CORE 8 ──────────────────────────────
  {
    code: 'general',
    title: 'General Dental Treatment Consent',
    is_default: true,
    body: {
      intro:
        'This form documents your understanding and consent for routine dental procedures (examination, scaling, polishing, fillings, etc.) recommended at our clinic.',
      procedure_clause: 'I have been advised to undergo the following procedure(s): {procedure}',
      sections: [
        {
          heading: 'Nature of treatment',
          paragraphs: [
            'I understand the nature, purpose, expected outcome, alternatives, and possible complications of the recommended procedure as explained to me by the treating dentist. I have had the opportunity to ask questions and have received satisfactory answers.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Mild post-operative sensitivity or discomfort that usually subsides within a few days.',
            'Allergic or adverse reaction to dental materials or medications administered.',
            'In rare cases, inadvertent damage to adjacent teeth or restorations.',
            'Failure of treatment requiring repeat or alternate procedures.',
          ],
        },
        {
          heading: 'My responsibilities',
          bullets: [
            'I will follow all post-procedure instructions and oral-hygiene advice provided.',
            'I will report any unusual symptoms (severe pain, swelling, fever) promptly.',
            'I will keep recall and review appointments as advised.',
            'I will pay the agreed fees as per the clinic billing policy.',
          ],
        },
      ],
      consent_statement:
        'I have read (or had read to me) the above information, my questions have been answered, no guarantees have been offered, and I voluntarily consent to the treatment described.',
      signature_lines: ['patient', 'doctor'],
    },
  },

  {
    code: 'extraction',
    title: 'Extraction / Oral Surgery Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo extraction / oral surgical procedure: {procedure}',
      anaesthesia_options: ['Local anaesthesia only', 'Nitrous oxide sedation', 'IV sedation / GA (referred)'],
      sections: [
        {
          heading: 'I understand',
          paragraphs: [
            'I understand why the treatment has been recommended and have had the opportunity to discuss it with the treating dentist. I have been informed of the available anaesthesia options and have selected my preference.',
            'I understand that teeth removal and oral surgery, like any surgical procedure, are not without risk.',
          ],
        },
        {
          heading: 'Risks include',
          bullets: [
            'Swelling and stiffness of the jaw — usually lasting up to a week.',
            'Bleeding — usually controlled easily; rarely requires medical attention.',
            'Pain and discomfort — generally well controlled by prescribed painkillers.',
            'Infection — uncommon when good oral hygiene is maintained after surgery.',
            'Dry socket — a persistently painful tooth socket, slow to heal; more common in smokers.',
            'Damage to adjacent teeth or fracture of the jawbone — very rare.',
            'Numbness, tingling or altered sensation of the lip, chin, tongue, gums or back teeth — due to proximity of nerves; rarely permanent.',
            'Sinus communication or root displacement when an upper back tooth is removed — may require a second procedure.',
            'Allergy or adverse reaction to anaesthetics, sedatives or post-op medications.',
          ],
        },
      ],
      consent_statement:
        'I understand the recommended treatment, the fees involved, the risks, alternatives and consequences of doing nothing. All my questions have been answered and no guarantees have been offered. I consent to the procedure.',
      signature_lines: ['patient', 'guardian', 'doctor'],
    },
  },

  {
    code: 'local_anesthesia',
    title: 'Informed Consent for Local Anaesthesia',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo the following procedure under local anaesthesia: {procedure}',
      sections: [
        {
          heading: 'Nature of local anaesthesia',
          paragraphs: [
            'I understand that anaesthetic agents are injected into a small area of the mouth to numb the tissues for the duration of the dental treatment, or near a nerve to block sensation in a wider area.',
          ],
        },
        {
          heading: 'Risks and side-effects include but are not limited to',
          bullets: [
            'Numbness which normally lasts two to three hours; can take longer depending on the agent used.',
            'In rare cases, prolonged or permanent numbness if a nerve is injured.',
            'Infection or swelling at the injection site.',
            'Allergic reaction, headache, dizziness, nausea, vomiting.',
            'Tenderness, discoloration, or accidental cheek/tongue/lip biting while numb.',
          ],
        },
        {
          heading: 'Potential benefits',
          paragraphs: [
            'I remain awake and able to respond to instructions. Pain is significantly lessened or eliminated during the treatment.',
          ],
        },
      ],
      consent_statement:
        'I have had the opportunity to ask questions about the recommended anaesthesia and have sufficient information to give consent. I hereby consent to the use of local anaesthesia as part of my treatment.',
      doctor_statement:
        'I attest that I have discussed the risks, benefits, consequences, and alternatives of anaesthesia with the patient (or representative). They have had the opportunity to ask questions and I believe they understand and consent.',
      signature_lines: ['patient', 'doctor'],
    },
  },

  {
    code: 'endodontic',
    title: 'Endodontic Treatment (Root Canal) Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo endodontic / root canal treatment: {procedure}',
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'Although serious complications with endodontic (root canal) therapy are very rare, I have been informed about the procedure. Endodontic therapy is performed to save a tooth that would otherwise need to be extracted, by conservative root-canal treatment or endodontic surgery.',
          ],
        },
        {
          heading: 'General risks',
          bullets: [
            'Swelling, sensitivity, bleeding, pain, infection, transient or permanent numbness/tingling in the lip, tongue, cheek, gums or teeth (rare, mainly from injections).',
            'Changes in occlusion (bite), jaw-muscle cramps and spasms, TMJ discomfort.',
            'Loosening of teeth, referred pain to ear/neck/head, nausea, vomiting, allergic reaction, delayed healing, sinus perforation, treatment failure.',
          ],
        },
        {
          heading: 'Risks specific to endodontic therapy',
          bullets: [
            'Possibility of instruments fracturing within the root canal.',
            'Perforation (extra opening) of the crown or root of the tooth.',
            'Damage to existing bridges, crowns, fillings or porcelain veneers.',
            'Loss of tooth structure during access preparation, including cracked teeth.',
            'Blocked canals due to fillings or prior treatment, calcifications, broken instruments, curved roots, periodontal (gum) disease, splits/fractures — all of which may make treatment impossible or require dental surgery.',
          ],
        },
        {
          heading: 'Consent',
          paragraphs: [
            'I do not expect any refund in case of risks of such dental treatment, since it involves the doctor\u2019s skill, materials and other costs.',
            'I understand that root-canal treatment is an attempt to save a tooth that may otherwise need extraction. Although success rate is high, success is not guaranteed; occasionally a tooth that has had root-canal therapy may require retreatment, surgery or extraction.',
          ],
        },
      ],
      consent_statement:
        'I, undersigned, being the patient, parent or guardian of the patient, consent to the performance of procedures decided upon as necessary or advisable in the opinion of the doctor.',
      signature_lines: ['patient', 'guardian', 'doctor'],
    },
  },

  {
    code: 'crown_bridge',
    title: 'Crown / Bridge / Prosthodontic Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo prosthodontic treatment: {procedure}',
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'Crowns and bridges replace lost tooth structure or missing teeth using fixed prosthetic restorations. The natural tooth/teeth must be reduced (prepared) to receive the crown or bridge.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Sensitivity to hot/cold for several days or weeks after preparation.',
            'Need for root-canal treatment if the pulp is irritated by tooth preparation.',
            'Temporary crown may dislodge — must be replaced promptly to prevent shift of the prepared tooth.',
            'Final crown may need adjustments for fit, bite and contact.',
            'Long-term success depends on supporting tooth structure, gum health, bite forces and oral hygiene.',
            'Crowns/bridges can fracture, debond or wear over time and may require repair or replacement.',
          ],
        },
        {
          heading: 'My responsibilities',
          bullets: [
            'Avoid sticky or extremely hard food on the temporary crown.',
            'Maintain meticulous oral hygiene around the margins of the crown/bridge.',
            'Attend recall visits for evaluation of fit and supporting tissues.',
          ],
        },
      ],
      consent_statement:
        'I have read and understood the procedure, alternatives (no treatment, removable prosthesis, implant), risks and costs. No guarantees have been offered. I voluntarily consent to the prosthodontic treatment.',
      signature_lines: ['patient', 'doctor'],
    },
  },

  {
    code: 'implant',
    title: 'Dental Implant Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo dental implant placement: {procedure}',
      anaesthesia_options: ['Local anaesthesia', 'Local anaesthesia with sedation'],
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'A dental implant is a titanium fixture surgically placed into the jawbone to replace a missing tooth root. After osseointegration (3–6 months), an abutment and final crown are placed.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Pain, swelling, bruising, bleeding for several days after surgery.',
            'Infection at the surgical site requiring antibiotics or surgical drainage.',
            'Failure of osseointegration — the implant may fail to fuse with the bone and require removal.',
            'Damage to adjacent teeth, nerves, sinus or anatomical structures.',
            'Numbness or altered sensation of the lip/chin/tongue — usually temporary, rarely permanent.',
            'Long-term peri-implantitis (gum/bone infection around the implant) leading to bone loss.',
            'Need for additional procedures (bone grafting, sinus lift, soft-tissue grafting).',
          ],
        },
        {
          heading: 'Critical post-operative responsibilities',
          bullets: [
            'No smoking for at least 2 weeks — smoking severely impairs healing and osseointegration.',
            'Avoid pressure or chewing on the surgical site as instructed.',
            'Attend all review and suture-removal appointments.',
            'Maintain rigorous oral hygiene around the implant for life.',
          ],
        },
      ],
      consent_statement:
        'I understand the surgical and prosthetic phases, the alternatives (bridge, removable denture, no replacement), the risks, the cost, and the importance of long-term maintenance. No guarantees of success have been offered. I voluntarily consent to dental implant treatment.',
      signature_lines: ['patient', 'doctor', 'witness'],
    },
  },

  {
    code: 'orthodontic',
    title: 'Orthodontic Treatment Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo orthodontic treatment: {procedure}',
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'Orthodontic treatment uses fixed appliances (braces) or aligners to move teeth into a more favourable position. Treatment duration is typically 6–30 months and depends on individual response and patient cooperation.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Soreness and ulceration of cheek/lip/tongue from brackets or wires; relieved by orthodontic wax.',
            'Decalcification (white spots) and cavities if oral hygiene is inadequate during treatment.',
            'Root resorption — minor shortening of tooth roots, occasionally significant.',
            'Relapse of tooth position if retainers are not worn as advised after active treatment.',
            'Temporomandibular joint (TMJ) discomfort.',
            'Need for tooth extractions or auxiliary procedures (mini-screws, surgery) in some cases.',
          ],
        },
        {
          heading: 'My responsibilities',
          bullets: [
            'Maintain meticulous oral hygiene; brush after every meal and use interdental aids.',
            'Avoid hard, sticky and very sugary foods that can damage appliances.',
            'Attend monthly review appointments without long gaps.',
            'Wear retainers exactly as prescribed after active treatment ends.',
          ],
        },
      ],
      consent_statement:
        'I have read and understood the goals, duration, alternatives, risks and my responsibilities during orthodontic treatment. No guarantees of an exact result have been offered. I voluntarily consent to orthodontic treatment.',
      signature_lines: ['patient', 'guardian', 'doctor'],
    },
  },

  {
    code: 'periodontal',
    title: 'Periodontal (Gum) Treatment Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo periodontal treatment: {procedure}',
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'Periodontal therapy treats infection and inflammation of the gums and supporting bone. Treatment may include scaling, root planing, curettage, or surgical procedures (flap surgery, bone or soft-tissue grafting).',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Gum recession exposing root surfaces — may cause sensitivity and aesthetic change.',
            'Tooth sensitivity to hot/cold for several weeks after deep cleaning.',
            'Loosening of teeth that were already mobile due to advanced bone loss.',
            'Post-operative pain, swelling, bruising, mild bleeding.',
            'Need for repeat or surgical procedures if disease persists or recurs.',
            'Tooth loss if periodontal disease cannot be controlled.',
          ],
        },
        {
          heading: 'My responsibilities',
          bullets: [
            'Follow brushing/flossing technique exactly as taught.',
            'Use prescribed antiseptic mouthwash for the recommended duration.',
            'Stop or significantly reduce smoking — smoking is a major risk factor for gum disease progression.',
            'Attend periodontal maintenance recalls every 3–6 months.',
          ],
        },
      ],
      consent_statement:
        'I have read and understood the recommended periodontal treatment, alternatives, risks and the importance of long-term maintenance. No guarantees of complete success have been offered. I voluntarily consent to the treatment.',
      signature_lines: ['patient', 'doctor'],
    },
  },

  // ────────────────────────── OPTIONAL 4 ───────────────────────────
  {
    code: 'sedation',
    title: 'Conscious Sedation / Nitrous Oxide Consent',
    is_default: true,
    body: {
      procedure_clause: 'I consent to receive conscious sedation for the dental procedure: {procedure}',
      anaesthesia_options: ['Nitrous oxide (laughing gas)', 'Oral sedation', 'IV sedation'],
      sections: [
        {
          heading: 'About sedation',
          paragraphs: [
            'Conscious sedation reduces anxiety and discomfort while keeping me responsive to verbal commands. Sedation does not eliminate the need for local anaesthesia for the procedure itself.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Drowsiness, dizziness, nausea or vomiting after sedation.',
            'Allergic reaction to the sedative agent.',
            'Slowed breathing or low blood pressure — monitored throughout the procedure.',
            'Rarely, prolonged effect requiring observation in a medical setting.',
          ],
        },
        {
          heading: 'My responsibilities',
          bullets: [
            'Disclose all medications, medical conditions and allergies.',
            'Fast as instructed by the clinic before the appointment.',
            'Arrange for a responsible adult to accompany me home — I will not drive or operate machinery for 24 hours after sedation.',
          ],
        },
      ],
      consent_statement:
        'I have had the opportunity to ask questions, understand the risks and benefits, and voluntarily consent to conscious sedation as part of my dental treatment.',
      signature_lines: ['patient', 'doctor', 'witness'],
    },
  },

  {
    code: 'pediatric',
    title: 'Pediatric Dental Treatment Consent (Parent / Guardian)',
    is_default: true,
    body: {
      procedure_clause: 'I authorise the dentist to perform the following procedure on my child: {procedure}',
      sections: [
        {
          heading: 'Behaviour-management techniques',
          paragraphs: [
            'I understand that the dental team may use a combination of behaviour-management techniques to help my child cooperate during treatment, including: tell-show-do, voice control, positive reinforcement, distraction, parental presence/absence, and protective stabilisation if absolutely necessary for safety.',
          ],
          bullets: [
            'Local anaesthesia for pain control.',
            'Nitrous oxide sedation when appropriate and after fasting instructions are followed.',
            'Restorative materials suitable for primary teeth (GIC, composite, stainless-steel crowns).',
            'Pulpotomy, pulpectomy or extraction when the tooth cannot be restored.',
          ],
        },
        {
          heading: 'Risks I acknowledge as parent / guardian',
          bullets: [
            'Soft-tissue injury from accidental biting while numb.',
            'Mild post-operative pain or swelling.',
            'Need for additional or alternative procedures based on findings during treatment.',
            'Allergic reactions to materials or medications.',
          ],
        },
      ],
      consent_statement:
        'I am the parent / legal guardian of the child named above. I have had the opportunity to ask questions and consent to the proposed treatment and behaviour-management techniques.',
      signature_lines: ['guardian', 'doctor', 'witness'],
    },
  },

  {
    code: 'bleaching',
    title: 'Teeth Whitening / Bleaching Consent',
    is_default: true,
    body: {
      procedure_clause: 'I have been advised to undergo teeth whitening / bleaching: {procedure}',
      sections: [
        {
          heading: 'About the procedure',
          paragraphs: [
            'Tooth whitening uses peroxide-based bleaching agents to lighten the colour of the natural teeth. Existing fillings, crowns and veneers will not change colour and may need to be replaced after whitening to match the new shade.',
          ],
        },
        {
          heading: 'Risks I acknowledge',
          bullets: [
            'Tooth sensitivity to hot/cold during and for a few days after treatment.',
            'Gum irritation from contact with the bleaching agent.',
            'Whitening result varies between individuals; results are not permanent and may relapse.',
            'May be ineffective on intrinsic stains (tetracycline, fluorosis) and dental restorations.',
            'Not recommended during pregnancy/lactation or for patients under 16.',
          ],
        },
      ],
      consent_statement:
        'I understand that final colour cannot be guaranteed, restorations may need replacement, and follow-up touch-up sessions may be necessary. I voluntarily consent to the whitening procedure.',
      signature_lines: ['patient', 'doctor'],
    },
  },

  {
    code: 'media_release',
    title: 'Photograph / Media Release',
    is_default: true,
    body: {
      sections: [
        {
          heading: 'Permission granted',
          paragraphs: [
            'I authorise the clinic to take clinical photographs, X-rays, intra-oral videos and digital scans of my teeth and oral cavity, before, during and after dental treatment, for the purposes of:',
          ],
          bullets: [
            'My personal clinical record and treatment planning.',
            'Internal case discussion among the clinical team.',
            'Anonymous educational use in lectures, conferences, peer-reviewed publications, or staff training, where my identity will not be disclosed.',
            'Marketing material on the clinic website, social media, and brochures, ONLY if I separately tick the marketing consent box below.',
          ],
        },
        {
          heading: 'Marketing consent (optional, tick to opt-in)',
          bullets: [
            '☐ I additionally permit the clinic to use my anonymised before/after photographs in marketing materials and on social media.',
          ],
        },
        {
          heading: 'Withdrawal',
          paragraphs: [
            'I understand I can withdraw any of these permissions at any time by writing to the clinic. Withdrawal will apply to future use only and will not affect material already published in good faith.',
          ],
        },
      ],
      consent_statement:
        'I have read and understood the above and voluntarily consent to the use of my clinical media as indicated.',
      signature_lines: ['patient', 'doctor'],
    },
  },
];
