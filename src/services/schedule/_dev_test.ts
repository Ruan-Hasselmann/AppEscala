import { generateSchedule } from "./generateSchedule";

const dates = ["2025-12-21"];

const people = [
  { personId: "p1", personName: "Ruan", leaderOfMinistryIds: ["som"] }, // líder de som => supervisor
  { personId: "p2", personName: "João", leaderOfMinistryIds: [] },
  { personId: "p3", personName: "Ana", leaderOfMinistryIds: [] },
];

const som = generateSchedule({
  dates,
  ministry: {
    id: "som",
    name: "SOM",
    roles: ["Mesa", "PA"],
    people,
  },
});

const supervisao = generateSchedule({
  dates,
  ministry: {
    id: "supervisao",
    name: "SUPERVISÃO",
    roles: ["Supervisor"],
    people,
  },
});

console.log("SOM:", som);
console.log("SUPERVISÃO:", supervisao);

// ✅ verificação manual esperada:
// - Ruan pode aparecer no SOM e também na SUPERVISÃO no mesmo dia (porque lidera SOM)
// - João/Ana não deveriam aparecer duas vezes no mesmo dia em dois ministérios diferentes (quando ligarmos o “agregador” global)
