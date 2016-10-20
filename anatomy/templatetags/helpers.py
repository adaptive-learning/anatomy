from django import template

register = template.Library()


def left_zeros(value, length):
    return "0" * (int(length) - len(str(value))) + str(value)


def price(value):
    return '{0:.2f}'.format(int(value) / 100)


def remove_time(value):
    result = " ".join(value.split(' ')[:-1])
    if ", " in result:
        return ", ".join(result.split(", ")[:-1])
    return result


register.filter('left_zeros', left_zeros)
register.filter('price', price)
register.filter('remove_time', remove_time)
