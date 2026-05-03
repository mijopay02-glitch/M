(function() {
  // Récupère les paramètres du marchand
  const script = document.currentScript;
  const merchant = script.getAttribute('data-merchant');
  const amount = script.getAttribute('data-amount');
  const currency = script.getAttribute('data-currency') || 'HTG';
  const description = script.getAttribute('data-description');
  const redirect = script.getAttribute('data-redirect');

  // Crée le bouton MIJO PAY
  const button = document.createElement('button');
  button.innerHTML = `
    <img src="https://i.postimg.cc/yYCsdY18/remove.png" 
         style="width:20px; vertical-align:middle; margin-right:8px;">
    Payer ${amount} ${currency} avec MIJO PAY
  `;
  button.style.cssText = `
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 10px rgba(33,150,243,0.3);
  `;

  // Quand on clique → ouvre la popup MIJO PAY
  button.onclick = function() {
    const url = `https://m-three-gamma.vercel.app/pay.html
      ?merchant=${merchant}
      &amount=${amount}
      &currency=${currency}
      &description=${encodeURIComponent(description)}
      &redirect=${encodeURIComponent(redirect)}`;
    
    // Ouvre une popup centrée
    const width = 400;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    window.open(url, 'MIJO PAY', 
      `width=${width},height=${height},left=${left},top=${top}`);
  };

  // Ajoute le bouton là où est le script
  script.parentNode.insertBefore(button, script);
})();
