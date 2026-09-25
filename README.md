# Sueca

Jogo de cartas Sueca numa mesa 3D ([three.js](https://threejs.org/)), jogável no navegador contra o computador. Um único ficheiro HTML, sem passo de build.

🔗 **Jogar:** https://stalinesatola.github.io/sueca/

Ou abre `index.html` diretamente num navegador.

## Modo de jogo

- 4 lugares à mesa (Sul, Oeste, Norte, Este), em duas equipas de parceiros opostos: **Sul + Norte** contra **Oeste + Este**.
- Antes de começar, escolhe quantas pessoas humanas jogam (1 a 4). Os lugares sem gente ficam com o computador.
- Com mais de um humano no mesmo dispositivo, o ecrã pede para passar o telemóvel/computador entre jogadas, mostrando só as cartas de quem tem a vez.
- Baralho de 40 cartas (Ás, 7, Rei, Valete, Dama, 6–2), trunfo revelado na última carta distribuída, obrigação de seguir o naipe, e pontuação oficial (Ás=11, 7=10, Rei=4, Valete=3, Dama=2).
- Baralhar, distribuir e jogar cartas têm animação própria; o computador joga com uma IA heurística consciente da equipa (não tenta bater o parceiro, poupa trunfos, alimenta pontos quando compensa).
