export default function editInput(selectedNode, inputNode, positionOnly) {
  const $previewer = inputNode;
  const $container = document.getElementsByClassName('kityminder-core-container');

  const textBox = selectedNode.getRenderBox('TextRenderer') || selectedNode.getRenderBox();
  let x = textBox.x - 6;
  let y = textBox.y + $container[0].offsetTop - 4;

  if (positionOnly === undefined) {
    $previewer.style.left = Math.round(x) + 'px';
    $previewer.style.top = Math.round(y) + 'px';
  } else {
    x = x + textBox.width / 2;
    return { x, y };
  }
}
