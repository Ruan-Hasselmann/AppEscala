export function getRolesForMinistry(ministryName: string): string[] {
  const name = ministryName.toUpperCase();

  switch (name) {
    case "SOM":
      return ["Mesa", "PA"];

    case "CÂMERA":
      return ["Câmera"];

    case "FOTO":
      return ["Foto"];

    case "PROJEÇÃO":
      return ["Slides"];

    case "LUZ":
      return ["Luz"];

    case "SUPERVISÃO":
      return ["Supervisor"];

    default:
      return ["Default"];
  }
}
