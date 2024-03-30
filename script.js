// Parámetros del círculo
const circleWidth = 850;
const innerRadius = 40;
const activeNotesFillColor = '#54B7D7';

// Datos de las notas
const notes = [
  [{ text: 'C', note: 1 }, { text: 'G', note: 8 }, { text: 'D', note: 3 }, { text: 'A', note: 10 }, { text: 'E', note: 5 }, { text: 'B', note: 12 }, { text: 'F#', note: 7 }, { text: 'C#', note: 2 }, { text: 'G#', note: 9 }, { text: 'D#', note: 4 }, { text: 'A#', note: 11 }, { text: 'F', note: 6 }],
  [{ text: 'a', note: 10 }, { text: 'e', note: 5 }, { text: 'b', note: 12 }, { text: 'f#', note: 7 }, { text: 'c#', note: 2 }, { text: 'g#', note: 9 }, { text: 'd#', note: 4 }, { text: 'a#', note: 11 }, { text: 'f', note: 6 }, { text: 'c', note: 1 }, { text: 'g', note: 8 }, { text: 'd', note: 3 }],
  [{ text: 'Bdim', note: 12 }, { text: 'F#dim', note: 7 }, { text: 'C#dim', note: 2 }, { text: 'G#dim', note: 9 }, { text: 'D#dim', note: 4 }, { text: 'A#dim', note: 11 }, { text: 'Fdim', note: 6 }, { text: 'Cdim', note: 1 }, { text: 'Gdim', note: 8 }, { text: 'Ddim', note: 3 }, { text: 'Adim', note: 10 }, { text: 'Edim', note: 5 }]
];

// Crear el elemento SVG que contendrá el círculo de quintas
const circleSvg = d3.select('body')
  .append('svg')
  .attr('width', circleWidth)
  .attr('height', circleWidth)
  .attr('viewBox', `-${circleWidth / 2} -${circleWidth / 2} ${circleWidth} ${circleWidth}`);

// Definir parámetros del círculo
const radius = circleWidth / 2;
const sliceThickness = radius / 3 - innerRadius;
const sliceAngle = Math.PI / 6; 
const root = circleSvg.append('g');

// Convertir coordenadas polares a cartesianas
const toCartesian = (a, r) => ({
  x: Math.cos(a) * r,
  y: Math.sin(a) * r,
});

// Calcular coordenadas de cada "slice" del círculo
const sliceCoordinates = (node) => {
  const { index, row } = node;
  const a1 = index * sliceAngle - (Math.PI / 2) + (Math.PI / 12);
  const a2 = a1 - sliceAngle;
  const r1 = radius - (row * sliceThickness);
  const r2 = r1 - sliceThickness;
  return [[
    toCartesian(a1, r1),
    toCartesian(a2, r1),
    toCartesian(a2, r2),
    toCartesian(a1, r2)
  ], [ r1, r2 ]];
};

// Función para obtener el nombre de un grado en notación romana
const degreeAsRoman = (degree) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][degree - 1];

// Función para obtener la escala mayor o menor a partir de la raíz
const getScale = (root, major = true) => {
  const scale = major ? [ 0, 2, 4, 5, 7, 9, 11 ] : [ 0, 2, 3, 5, 7, 8, 10 ];
  return scale.map((semiTones, i) => ({
    degree: i + 1,
    note: (root + semiTones) % 12 || 12
  }));
}

// Función para calcular el centro de un "slice"
const sliceCenter = (node) => {
  const [coords] = sliceCoordinates(node);
  const xCoords = coords.map(d => d.x);
  const yCoords = coords.map(d => d.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  return {
    x: minX + ((maxX - minX) / 2),
    y: minY + ((maxY - minY) / 2),
  };
};

// Funciones para obtener el siguiente y anterior índice en el círculo
const nextIndex = (index) => index === 11 ? 0 : index + 1;
const previousIndex = (index) => index === 0 ? 11 : index - 1;

// Función para determinar si un nodo está activo
const isActive = (d, index) => (d.index === index) || (d.index === nextIndex(index) && (d.row === 0 || d.row === 1)) || (d.index === previousIndex(index) && (d.row === 0 || d.row === 1));

// Función para generar el path de un "slice"
const slicePath = (node) => {
  const [[ c1, c2, c3, c4 ], [r1, r2] ] = sliceCoordinates(node);
  return `
    M ${c1.x} ${c1.y}
    A ${r1} ${r1} 0 0 0 ${c2.x} ${c2.y}
    L ${c3.x} ${c3.y}
    A ${r2} ${r2} 0 0 1 ${c4.x} ${c4.y}`;
}

// Inicialización de datos
let data = d3.range(3).map(() => d3.range(12)).flatMap((data, row) => data.map(index => {
  const note = notes[row][index];
  return {
    ...note,
    row,
    index,
    active: false,
  };
})).map((d, i) => ({ ...d, id: i }));

// Manejador de eventos click
const handleClick = (update) => function() {
  const datum = d3.select(this).data()[0];
  if (!datum) {
    console.error('datum is undefined');
    return;
  }
  let root = datum.note;
  const majorScale = datum.row !== 1;
  if (datum.row === 2) {
    root = data.find(d => d.row === 0 && d.index === datum.index).note;
  }
  const scale = getScale(root, majorScale);
  const newData = data.map(d => {
    const inScaleNote = scale.find(n => n.note === d.note);
    return {
      ...d,
      active: isActive(d, datum.index),
      degree: inScaleNote ? inScaleNote.degree : undefined,
    };
  });
  update(newData, datum.index);
};

// Función principal para dibujar el círculo
const run = (_data, activeIndex) => {
  const t = root.transition().duration(300);
  const chordsUpdate = root.selectAll('g.chord').data(_data, d => d.id).classed('active', d => d.active);
  chordsUpdate.call(update => {
    const tr = update.transition(t);
    tr.select('text.chord-name').attr('fill', (d) => d.active ? 'white' : '#ababab');
    tr.select('path').attr('fill', (d) => d.active ? activeNotesFillColor : 'rgba(0,0,0,0)');
    tr.select('text.degree').attr('fill-opacity', d => d.active ? 1 : 0).text(d => d.active ? degreeAsRoman(d.degree) : '');
  });
  const chordsEnter = chordsUpdate.enter().append('g').classed('chord', true).style('cursor', 'pointer');
  chordsEnter.append('path').attr('fill', 'transparent').attr('fill-opacity', 0.5).attr('stroke-width', 1).attr('stroke', '#333').attr('d', (d) => slicePath(d)).on('click', handleClick(run)).attr('fill', 'transparent');
  chordsEnter.append('text').classed('chord-name', true).attr('text-anchor', 'middle').attr('fill', 'white').attr('x', (d) => sliceCenter(d).x).attr('y', (d) => sliceCenter(d).y).attr('font-size', '2em').text(d => d.text).on('click', handleClick(run));
  chordsEnter.append('text').classed('degree', true).attr('x', (d) => sliceCenter(d).x).attr('y', (d) => sliceCenter(d).y).attr('dx', 3).attr('dy', -25).attr('font-size', '1.5em').attr('fill', '#20A3CD').attr('text-anchor', 'middle').text(d => d.active ? degreeAsRoman(d.degree) : '');
  chordsUpdate.exit().remove();
};

// Ejecutar función principal con los datos iniciales
run(data);