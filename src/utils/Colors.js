class ColorUtils {
  constructor (client = {}) { this.client = client }
  static highestColor (member) { return member.roles.highest.color }
}

module.exports = ColorUtils
