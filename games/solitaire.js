
    this.dragging = {
      cards: draggedCards,
      sourcePile: hit.pile,
      sourceIndex: hit.index,
      offsetX: pt.x - this.getCardPos(draggedCards[0], hit.pile, hit.index).x,
      offsetY: pt.y - (this.getCardPos(draggedCards[0], hit.pile, hit.index).y + (hit.cardIndex ? hit.cardIndex * 28 : 0)),
      x: pt.x,
      y: pt.y
    };

    if (this.dragging.cards.length > 0) {
      AudioEngine.tone(500, 0.05, 'sine', 0.05);
    }
  }

  handlePointerMove(pt) {
    if (!this.dragging) return;
    this.dragging.x = pt.x - this.dragging.offsetX;
    this.dragging.y = pt.y - this.dragging.offsetY;
  }

  handlePointerUp() {
    if (!this.dragging) return;
    const drag = this.dragging;
    this.dragging = null;

    let dropped = false;
    const firstCard = drag.cards[0];
    const dropPt = { x: drag.x + this.cardW / 2, y: drag.y + this.cardH / 2 };

    for (let i = 0; i < this.foundations.length; i++) {
      const pos = this.getCardPos(null, 'foundation', i);
      if (dropPt.x >= pos.x - 20 && dropPt.x <= pos.x + this.cardW + 20 && dropPt.y >= pos.y - 20 && dropPt.y <= pos.y + this.cardH + 20) {
        if (drag.cards.length === 1 && this.canPlaceOnFoundation(firstCard, i)) {
          this.foundations[i].push(firstCard);
          this.score += 10;
          AudioEngine.win();
          Haptics.success();
          Particles.burst(pos.x + this.cardW/2, pos.y + this.cardH/2, 10, { color: '#2bff88', minSpeed: 50, maxSpeed: 150 });
          dropped = true;
        }
        break;
      }
    }

    if (!dropped) {
      for (let i = 0; i < this.tableau.length; i++) {
        const pos = this.getCardPos(null, 'tableau', i);
        const pile = this.tableau[i];
        let targetY = pos.y + (pile.length * 28);
        
        if (dropPt.x >= pos.x - 30 && dropPt.x <= pos.x + this.cardW + 30) {
          const lastCard = pile[pile.length - 1];
          if (this.canPlaceOnTableau(firstCard, lastCard, pile.length === 0)) {
             pile.push(...drag.cards);
             this.score += 5;
             AudioEngine.tone(600, 0.05, 'sine', 0.1);
             Haptics.light();
             dropped = true;
             break;
          }
        }
      }
    }

    if (!dropped) {
      if (drag.sourcePile === 'waste') {
        this.waste.push(...drag.cards);
      } else {
        this.tableau[drag.sourceIndex].push(...drag.cards);
      }
      AudioEngine.tone(200, 0.1, 'sawtooth', 0.05);
    } else {
      this.moves++;
      this.checkAutoFlip();
      this.checkWin();
    }

    this.updateHud();
  }

  drawFromStock() {
    if (this.stock.length === 0) {
      if (this.waste.length === 0) return;
      this.stock = this.waste.reverse();
      this.waste = [];
      this.stock.forEach(c => c.faceUp = false);
      AudioEngine.tone(300, 0.1, 'triangle', 0.1);
    } else {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
      AudioEngine.tone(700, 0.05, 'sine', 0.1);
    }
  }

  canPlaceOnFoundation(card, fIdx) {
    const pile = this.foundations[fIdx];
    if (pile.length === 0) return card.rank === 1;
    const top = pile[pile.length - 1];
    return top.suit === card.suit && top.rank === card.rank - 1;
  }

  canPlaceOnTableau(card, topCard, isEmpty) {
    if (isEmpty) return card.rank === 13;
    if (!topCard.faceUp) return false;
    const isRed = card.suit === 1 || card.suit === 2;
    const isTopRed = topCard.suit === 1 || topCard.suit === 2;
    return isRed !== isTopRed && topCard.rank === card.rank + 1;
  }

  checkAutoFlip() {
    for (let i = 0; i < this.tableau.length; i++) {
      const pile = this.tableau[i];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        AudioEngine.tone(400, 0.05, 'sine', 0.1);
      }
    }
  }

  checkWin() {
    if (this.foundations.every(f => f.length === 13)) {
      this.state = 'won';
      AudioEngine.win();
      Haptics.success();
      Camera.add(1);
      for (let i = 0; i < 50; i++) {
        Particles.burst(this.w/2, this.h/2, 10, { color: '#ffc531', minSpeed: 200, maxSpeed: 600, gravity: 400 });
      }
      setTimeout(() => App.gameOver('solitaire', 5000), 2000);
    }
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#05070d');
    bg.addColorStop(1, '#0f1423');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 32px Tahoma';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.fillText('SOLITAIRE', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx);
      return;
    }

    const drawEmptyPile = (x, y, symbol) => {
      ctx.fillStyle = 'rgba(0,229,255,0.05)';
      ctx.strokeStyle = 'rgba(0,229,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, this.cardW, this.cardH, 6);
      ctx.fill();
      ctx.stroke();
      if (symbol) {
        ctx.fillStyle = 'rgba(0,229,255,0.2)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x + this.cardW/2, y + this.cardH/2);
      }
    };

    drawEmptyPile(10, this.topY, '↻');
    for (let i = 0; i < 4; i++) {
      drawEmptyPile(this.w - (this.cardW + this.gapX) * (4 - i) + 10, this.topY, '♠');
    }
    for (let i = 0; i < 7; i++) {
      drawEmptyPile(10 + i * (this.cardW + this.gapX), this.tableauY, 'K');
    }

    if (this.stock.length > 0) {
      const pos = this.getCardPos(null, 'stock');
      this.drawCard(ctx, this.stock[this.stock.length - 1], pos.x, pos.y, false, false);
    }

    for (let i = 0; i < this.waste.length; i++) {
      const pos = this.getCardPos(this.waste[i], 'waste');
      this.drawCard(ctx, this.waste[i], pos.x, pos.y, false, false);
    }

    for (let i = 0; i < this.foundations.length; i++) {
      const pile = this.foundations[i];
      if (pile.length > 0) {
        const pos = this.getCardPos(null, 'foundation', i);
        this.drawCard(ctx, pile[pile.length - 1], pos.x, pos.y, false, false);
      }
    }

    for (let i = 0; i < this.tableau.length; i++) {
      const pile = this.tableau[i];
      const pos = this.getCardPos(null, 'tableau', i);
      let cy = pos.y;
      for (let j = 0; j < pile.length; j++) {
        const card = pile[j];
        this.drawCard(ctx, card, pos.x, cy, false, false);
        cy += card.faceUp ? 28 : 12;
      }
    }

    if (this.dragging) {
      let dx = this.dragging.x;
      let dy = this.dragging.y;
      for (let i = 0; i < this.dragging.cards.length; i++) {
        this.drawCard(ctx, this.dragging.cards[i], dx, dy, true, i === 0);
        dy += 28;
      }
    }

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  drawCard(ctx, card, x, y, isDragging, isTop) {
    ctx.save();
    
    if (isDragging && isTop) {
      ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }

    const w = this.cardW;
    const h = this.cardH;
    const radius = 6;

    if (!card.faceUp) {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#111a2e');
      g.addColorStop(1, '#0c1120');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(0,229,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(0,229,255,0.15)';
      ctx.beginPath();
      ctx.arc(x + w/2, y + h/2, w/4, 0, Math.PI*2);
      ctx.fill();
    } else {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#e0e5ec');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const suit = this.suits[card.suit];
      ctx.fillStyle = suit.color;
      
      ctx.font = `bold ${Math.floor(w * 0.22)}px Tahoma`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.ranks[card.rank], x + 6, y + 4);
      ctx.font = `${Math.floor(w * 0.2)}px Arial`;
      ctx.fillText(suit.sym, x + 6, y + 4 + w * 0.22);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.font = `bold ${Math.floor(w * 0.22)}px Tahoma`;
      ctx.fillText(this.ranks[card.rank], x + w - 6, y + h - 4);
      ctx.font = `${Math.floor(w * 0.2)}px Arial`;
      ctx.fillText(suit.sym, x + w - 6, y + h - 4 - w * 0.22);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.floor(w * 0.5)}px Arial`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(suit.sym, x + w / 2, y + h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._move) this.canvas.removeEventListener('pointermove', this._move);
    if (this._up) {
      window.removeEventListener('pointerup', this._up);
      window.removeEventListener('pointercancel', this._up);
    }
  }
};
