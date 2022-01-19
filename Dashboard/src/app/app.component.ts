import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'COVID-19 Impfkampagne in Deutschland';

    constructor(
        iconRegistry: MatIconRegistry,
        sanitizer: DomSanitizer,
        router: Router
    ) {
        iconRegistry.addSvgIcon(
            'github',
            sanitizer.bypassSecurityTrustResourceUrl('assets/img/GitHub-Mark.svg')
        );

        // check for scheduled redirects (github-pages specific)
        let comingFrom = localStorage.getItem('coming-from');
        if (comingFrom) {
            localStorage.removeItem('coming-from');
            comingFrom = comingFrom.replace('cov19vaccsim/', './');
            console.log(`Found redirect request to ${comingFrom}. Redirecting...`);
            router.navigate([comingFrom]).catch(error => {
                console.warn(`Redirect to ${comingFrom} failed!`, error);
            });
        }
    }

}
