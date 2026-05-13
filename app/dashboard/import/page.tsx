import Papa from 'papaparse';

const handleUpload = (e: any, table: string) => {
  Papa.parse(e.target.files[0], {
    header: true,
    complete: async (results) => {
      await supabase.from(table).insert(results.data);
      alert("¡Datos cargados!");
    }
  });
};