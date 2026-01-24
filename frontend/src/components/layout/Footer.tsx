import Link from 'next/link'
import { TreePine, Mail } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    'Продукт': [
      { label: 'Возможности', href: '/#features' },
    ],
    'Компания': [
      { label: 'О проекте', href: '/about' },
      { label: 'Блог', href: '/blog' },
      { label: 'Контакты', href: '/contact' },
    ],
    'Правовая информация': [
      { label: 'Конфиденциальность', href: '/privacy' },
      { label: 'Условия использования', href: '/terms' },
      { label: 'Политика обработки персональных данных', href: '/personal-data-policy' },
      { label: 'Публичная оферта', href: '/public-offer' },
      { label: 'Cookies', href: '/cookies' },
    ],
  }

  const socialLinks = [
    { icon: Mail, href: 'mailto:contact@genetictree.com', label: 'Email' },
  ]

  return (
    <footer className="bg-charcoal-900 border-t border-charcoal-700">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
                <TreePine className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-2xl font-bold">
                Genetic<span className="gradient-text">Tree</span>
              </span>
            </div>
            <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-sm">
              Создавайте и сохраняйте историю вашей семьи с помощью современных
              инструментов для управления семейным древом.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 flex items-center justify-center transition-colors group"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-gray-400 group-hover:text-orange transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-orange transition-colors text-base"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-charcoal-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} GeneticTree. Все права защищены.
            </p>
            <p className="text-gray-500 text-sm">
              Создано с заботой о сохранении семейных воспоминаний
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
